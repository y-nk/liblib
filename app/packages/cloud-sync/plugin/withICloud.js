/**
 * Expo config plugin that wires the iCloud entitlement, Info.plist metadata,
 * and the LiblibICloud native pod into the generated iOS project.
 *
 * The plugin is **identifier-driven**: the caller passes the iCloud container
 * id (e.g. `iCloud.com.liblib.app`). The same id flows into:
 *   - `com.apple.developer.icloud-container-identifiers` entitlement
 *   - `com.apple.developer.ubiquity-container-identifiers` entitlement
 *   - `com.apple.developer.icloud-services = ['CloudDocuments']` entitlement
 *   - `NSUbiquitousContainers` in Info.plist (gives the folder its
 *     "Liblib" display name in Files.app)
 *   - `LiblibICloudContainerIdentifier` in Info.plist so the Swift module
 *     can resolve the container at runtime without re-hardcoding the id.
 *
 * The native pod itself lives under `../ios/`; we expose it via Expo's
 * Podfile autolink integration so a regular `pod install` after prebuild
 * picks it up — no manual Podfile edits.
 *
 * The plugin is intentionally `.js` not `.ts` because Expo loads config
 * plugins at prebuild time and we don't want a transpile step.
 */
const { withEntitlementsPlist, withInfoPlist, withDangerousMod } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

/**
 * Placeholder container id used when the host app hasn't provisioned a real
 * one yet. The JS bundle and `expo prebuild` both succeed against this
 * value — only an actual iOS device build (with a paid Apple Developer
 * account) requires a real container.
 */
const PLACEHOLDER_CONTAINER_ID = 'iCloud.com.example.placeholder'

/**
 * Inserts a single `pod 'LiblibICloud', :path => '...'` line into the
 * generated `ios/Podfile`, just before the closing `end` of the target
 * block. Idempotent — the marker comment prevents repeat insertions if
 * prebuild is run multiple times without `--clean`.
 */
const withLiblibICloudPod = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile')

      if (!fs.existsSync(podfilePath)) {
        return cfg
      }

      const marker = '# @liblib/icloud pod'
      let contents = fs.readFileSync(podfilePath, 'utf8')

      if (contents.includes(marker)) {
        return cfg
      }

      // Path from `ios/` (inside the prebuilt project) back to the package
      // root that holds the podspec.
      const podPath = path.relative(
        cfg.modRequest.platformProjectRoot,
        path.join(__dirname, '..', 'ios'),
      )

      const podLine = `  ${marker}\n  pod 'LiblibICloud', :path => '${podPath}'`

      // Insert before the first `end` that closes a `target ... do` block.
      // Expo's default Podfile uses `target 'liblib' do ... end`.
      const targetEnd = contents.search(/\n[ \t]*end[ \t]*\n/)

      if (targetEnd === -1) {
        contents = `${contents}\n${podLine}\n`
      } else {
        contents = contents.slice(0, targetEnd) + `\n${podLine}` + contents.slice(targetEnd)
      }

      fs.writeFileSync(podfilePath, contents)

      return cfg
    },
  ])
}

const withICloudEntitlements = (config, containerId) => {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.icloud-container-identifiers'] = [containerId]
    cfg.modResults['com.apple.developer.ubiquity-container-identifiers'] = [containerId]
    cfg.modResults['com.apple.developer.icloud-services'] = ['CloudDocuments']

    return cfg
  })
}

const withICloudInfoPlist = (config, containerId) => {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSUbiquitousContainers = {
      [containerId]: {
        // Visible to the user in Files.app as the container's display name.
        NSUbiquitousContainerName: 'Liblib',
        NSUbiquitousContainerIsDocumentScopePublic: true,
        NSUbiquitousContainerSupportedFolderLevels: 'Any',
      },
    }

    // Read by the Swift module at runtime so we don't hardcode the id in
    // native code.
    cfg.modResults.LiblibICloudContainerIdentifier = containerId

    return cfg
  })
}

/**
 * @param {object} config
 * @param {object} [props]
 * @param {string} [props.containerIdentifier]
 */
const withICloud = (config, props) => {
  const containerId =
    (props && props.containerIdentifier) ||
    process.env.LIBLIB_ICLOUD_CONTAINER ||
    PLACEHOLDER_CONTAINER_ID

  config = withICloudEntitlements(config, containerId)
  config = withICloudInfoPlist(config, containerId)
  config = withLiblibICloudPod(config)

  return config
}

module.exports = withICloud
module.exports.PLACEHOLDER_CONTAINER_ID = PLACEHOLDER_CONTAINER_ID
