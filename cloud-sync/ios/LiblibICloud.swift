import Foundation
import React
import CommonCrypto

/**
 * Native iOS surface backing `ICloudAdapter` on the JS side.
 *
 * Responsibilities:
 *   - Resolve the ubiquity container URL from the configured container id
 *     (`LiblibICloudContainerIdentifier` in Info.plist, injected by the
 *     Expo config plugin).
 *   - File-coordinated read/write/delete inside `<container>/Documents/Liblib/`
 *     so the folder shows up in Files.app under the configured ubiquity
 *     container.
 *   - Etag synthesis: prefer `NSFileVersion.currentVersionOfItem(at:)
 *     .persistentIdentifier`; fall back to a SHA-256 of the file contents if
 *     the version identifier is unavailable or fails to encode (rare, but
 *     happens on stale conflict copies).
 *
 * All methods bridge to JS via the legacy bridge module API; we keep this
 * shape so the module loads under both the old arch and the new arch's
 * interop layer without a TurboModule codegen step.
 */
@objc(LiblibICloud)
class LiblibICloud: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // MARK: - Container resolution -----------------------------------------

  private func containerIdentifier() -> String? {
    let value = Bundle.main.object(forInfoDictionaryKey: "LiblibICloudContainerIdentifier")
    return value as? String
  }

  private func ubiquityRoot() -> URL? {
    guard FileManager.default.ubiquityIdentityToken != nil else {
      return nil
    }
    let id = containerIdentifier()
    return FileManager.default.url(forUbiquityContainerIdentifier: id)
  }

  /// Maps a JS-side relative path ("liblib.db", "covers/abc.jpg") to the
  /// absolute URL inside `<container>/Documents/Liblib/`. Returns nil if
  /// iCloud is unavailable.
  private func resolve(_ relativePath: String) -> URL? {
    guard let root = ubiquityRoot() else {
      return nil
    }
    let liblib = root.appendingPathComponent("Documents", isDirectory: true)
      .appendingPathComponent("Liblib", isDirectory: true)
    // Ensure parent directory exists; harmless if already present.
    try? FileManager.default.createDirectory(
      at: liblib, withIntermediateDirectories: true, attributes: nil)
    return liblib.appendingPathComponent(relativePath)
  }

  // MARK: - Etag synthesis -----------------------------------------------

  private func etag(for url: URL) -> String {
    if let version = NSFileVersion.currentVersionOfItem(at: url),
      let id = version.persistentIdentifier as? NSCoding
    {
      let data = try? NSKeyedArchiver.archivedData(
        withRootObject: id, requiringSecureCoding: false)
      if let data = data {
        return data.base64EncodedString()
      }
    }
    if let data = try? Data(contentsOf: url) {
      return sha256(data)
    }
    return ""
  }

  private func sha256(_ data: Data) -> String {
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes {
      _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
    }
    return hash.map { String(format: "%02x", $0) }.joined()
  }

  // MARK: - Bridge methods ------------------------------------------------

  @objc(isAvailable:rejecter:)
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(ubiquityRoot() != nil)
  }

  @objc(getFile:resolver:rejecter:)
  func getFile(
    _ path: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let url = self.resolve(path) else {
      reject("ICLOUD_UNAVAILABLE", "iCloud is not available", nil)
      return
    }

    // Kick off download if non-resident; harmless if already local.
    try? FileManager.default.startDownloadingUbiquitousItem(at: url)

    let coordinator = NSFileCoordinator(filePresenter: nil)
    var coordError: NSError?
    var result: [String: Any]? = nil
    var readError: Error? = nil

    coordinator.coordinate(readingItemAt: url, options: [], error: &coordError) { readURL in
      if !FileManager.default.fileExists(atPath: readURL.path) {
        result = nil
        return
      }
      do {
        let data = try Data(contentsOf: readURL)
        result = [
          "base64": data.base64EncodedString(),
          "etag": self.etag(for: readURL),
        ]
      } catch {
        readError = error
      }
    }

    if let err = coordError ?? (readError as NSError?) {
      reject("ICLOUD_READ_FAILED", err.localizedDescription, err)
      return
    }
    resolve(result as Any?)
  }

  @objc(putFile:base64:ifMatchEtag:resolver:rejecter:)
  func putFile(
    _ path: String,
    base64: String,
    ifMatchEtag: NSString?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let url = self.resolve(path) else {
      reject("ICLOUD_UNAVAILABLE", "iCloud is not available", nil)
      return
    }
    guard let data = Data(base64Encoded: base64) else {
      reject("ICLOUD_BAD_BASE64", "putFile base64 payload was not valid base64", nil)
      return
    }

    let coordinator = NSFileCoordinator(filePresenter: nil)
    var coordError: NSError?
    var resultEtag: String? = nil
    var mismatch = false
    var writeError: Error? = nil

    coordinator.coordinate(
      writingItemAt: url, options: .forReplacing, error: &coordError
    ) { writeURL in
      // Recompute the current etag inside the coordinated block so we don't
      // race with another writer between read and write.
      if let ifMatch = ifMatchEtag as String? {
        let currentExists = FileManager.default.fileExists(atPath: writeURL.path)
        let currentEtag = currentExists ? self.etag(for: writeURL) : ""
        if currentEtag != ifMatch {
          mismatch = true
          return
        }
      }
      do {
        // Ensure parent dir for nested paths like "covers/abc.jpg".
        let parent = writeURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(
          at: parent, withIntermediateDirectories: true, attributes: nil)
        try data.write(to: writeURL, options: .atomic)
        resultEtag = self.etag(for: writeURL)
      } catch {
        writeError = error
      }
    }

    if let err = coordError ?? (writeError as NSError?) {
      reject("ICLOUD_WRITE_FAILED", err.localizedDescription, err)
      return
    }
    if mismatch {
      resolve(["etagMismatch": true])
      return
    }
    resolve(["etag": resultEtag ?? ""])
  }

  @objc(listFiles:resolver:rejecter:)
  func listFiles(
    _ dir: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let url = self.resolve(dir) else {
      reject("ICLOUD_UNAVAILABLE", "iCloud is not available", nil)
      return
    }
    // listFiles on a missing directory is not an error.
    if !FileManager.default.fileExists(atPath: url.path) {
      resolve([])
      return
    }

    do {
      let entries = try FileManager.default.contentsOfDirectory(
        at: url,
        includingPropertiesForKeys: [.fileSizeKey, .isDirectoryKey],
        options: [.skipsHiddenFiles, .skipsSubdirectoryDescendants]
      )
      var out: [[String: Any]] = []
      for entry in entries {
        let values = try entry.resourceValues(forKeys: [.fileSizeKey, .isDirectoryKey])
        if values.isDirectory == true {
          continue
        }
        // Pull non-resident items down so subsequent getFile calls see data.
        try? FileManager.default.startDownloadingUbiquitousItem(at: entry)
        out.append([
          "name": entry.lastPathComponent,
          "etag": self.etag(for: entry),
          "size": values.fileSize ?? 0,
        ])
      }
      resolve(out)
    } catch {
      reject("ICLOUD_LIST_FAILED", error.localizedDescription, error)
    }
  }

  @objc(deleteFile:resolver:rejecter:)
  func deleteFile(
    _ path: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let url = self.resolve(path) else {
      reject("ICLOUD_UNAVAILABLE", "iCloud is not available", nil)
      return
    }

    let coordinator = NSFileCoordinator(filePresenter: nil)
    var coordError: NSError?
    var deleteError: Error? = nil

    coordinator.coordinate(
      writingItemAt: url, options: .forDeleting, error: &coordError
    ) { deleteURL in
      if !FileManager.default.fileExists(atPath: deleteURL.path) {
        return
      }
      do {
        try FileManager.default.removeItem(at: deleteURL)
      } catch {
        deleteError = error
      }
    }

    if let err = coordError ?? (deleteError as NSError?) {
      reject("ICLOUD_DELETE_FAILED", err.localizedDescription, err)
      return
    }
    resolve(nil)
  }
}
