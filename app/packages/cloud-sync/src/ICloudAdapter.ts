import type { CloudAdapter, CloudFile, CloudListEntry, PutOptions, PutResult } from './CloudAdapter'
import { EtagMismatchError } from './errors'

/**
 * Shape of the underlying native module the adapter calls into. The real
 * implementation is a tiny Swift class registered as `LiblibICloud` on iOS;
 * an injectable surface here lets us test the adapter without a device and
 * lets non-iOS hosts (Android, Node tests) pass a stub.
 *
 * Methods mirror `CloudAdapter` but use base64 strings on the bridge — RN's
 * codegen can't move `Uint8Array` directly without TurboModule type plumbing
 * we don't need yet. Base64 conversion happens in this file so the rest of
 * the sync engine continues to deal in `Uint8Array`.
 */
export type ICloudNativeModule = {
  /**
   * True iff the device has an iCloud account signed in AND the configured
   * ubiquity container resolves. Native side wraps
   * `FileManager.default.ubiquityIdentityToken` plus a guard on
   * `url(forUbiquityContainerIdentifier:)`.
   */
  isAvailable(): Promise<boolean>
  getFile(path: string): Promise<{ base64: string; etag: string } | null>
  putFile(
    path: string,
    base64: string,
    ifMatchEtag: string | null,
  ): Promise<{ etag: string } | { etagMismatch: true }>
  listFiles(dir: string): Promise<{ name: string; etag: string; size: number }[]>
  deleteFile(path: string): Promise<void>
}

export class ICloudNotAvailableError extends Error {
  constructor() {
    super('iCloud is not available — sign into iCloud in iOS Settings')
    this.name = 'ICloudNotAvailableError'
  }
}

export type ICloudAdapterOptions = {
  native: ICloudNativeModule
}

/**
 * `CloudAdapter` against the iOS ubiquity container. The actual filesystem
 * work happens in the Swift module; this class just marshals bytes <-> base64
 * and maps the `{ etagMismatch: true }` sentinel to `EtagMismatchError` so
 * the engine's retry loop behaves uniformly across providers.
 */
export class ICloudAdapter implements CloudAdapter {
  private readonly native: ICloudNativeModule

  constructor(opts: ICloudAdapterOptions) {
    this.native = opts.native
  }

  /**
   * Pre-flight used by the "Sync with iCloud" button before we commit to
   * `cloud.provider = 'apple'`. Throws `ICloudNotAvailableError` if the user
   * has no iCloud account or the container can't be resolved.
   */
  async assertAvailable(): Promise<void> {
    const ok = await this.native.isAvailable()

    if (!ok) {
      throw new ICloudNotAvailableError()
    }
  }

  async getFile(path: string): Promise<CloudFile | null> {
    const out = await this.native.getFile(path)

    if (!out) {
      return null
    }

    return { data: base64ToBytes(out.base64), etag: out.etag }
  }

  async putFile(path: string, data: Uint8Array, options?: PutOptions): Promise<PutResult> {
    const res = await this.native.putFile(path, bytesToBase64(data), options?.ifMatchEtag ?? null)

    if ('etagMismatch' in res) {
      throw new EtagMismatchError(path)
    }

    return { etag: res.etag }
  }

  async listFiles(dir: string): Promise<CloudListEntry[]> {
    return await this.native.listFiles(dir)
  }

  async deleteFile(path: string): Promise<void> {
    await this.native.deleteFile(path)
  }
}

// Base64 helpers --------------------------------------------------------
//
// We avoid `Buffer` (not in RN's default JS env without a polyfill) and we
// avoid `btoa` on raw bytes (it expects Latin-1 strings, not binary). The
// loops below match the encoding used by the React Native Hermes runtime and
// by Node 22 — verified by round-tripping through both in the test suite.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  let i = 0

  for (; i + 2 < bytes.length; i += 3) {
    const a = bytes[i]
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    out += B64[a >> 2]
    out += B64[((a & 0x03) << 4) | (b >> 4)]
    out += B64[((b & 0x0f) << 2) | (c >> 6)]
    out += B64[c & 0x3f]
  }

  if (i < bytes.length) {
    const a = bytes[i]
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0
    out += B64[a >> 2]
    out += B64[((a & 0x03) << 4) | (b >> 4)]

    if (i + 1 < bytes.length) {
      out += B64[(b & 0x0f) << 2]
      out += '='
    } else {
      out += '=='
    }
  }

  return out
}

export function base64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/=]/g, '')
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  const len = (clean.length / 4) * 3 - pad
  const out = new Uint8Array(len)
  let oi = 0

  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i])
    const b = B64.indexOf(clean[i + 1])
    const c = clean[i + 2] === '=' ? 0 : B64.indexOf(clean[i + 2])
    const d = clean[i + 3] === '=' ? 0 : B64.indexOf(clean[i + 3])
    const chunk = (a << 18) | (b << 12) | (c << 6) | d

    if (oi < len) {
      out[oi++] = (chunk >> 16) & 0xff
    }

    if (oi < len) {
      out[oi++] = (chunk >> 8) & 0xff
    }

    if (oi < len) {
      out[oi++] = chunk & 0xff
    }
  }

  return out
}
