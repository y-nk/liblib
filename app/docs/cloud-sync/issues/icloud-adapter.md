## Parent

`../README.md`

## What to build

Replace the `'fake'` placeholder in `EnableSyncSheet`'s "Sync with iCloud" button with a real `ICloudAdapter` that reads and writes to the app's iCloud ubiquity container, surfaced to the user as a `Liblib/` folder in iCloud Drive (Files.app).

This requires both Expo config plugin work and a native Swift module — there is no off-the-shelf RN library to lean on, so we build a minimal one. The largest risk in the feature.

Native module surface (mirrors `CloudAdapter`):

- `getFile(relativePath)` → resolves the ubiquity container URL via `FileManager.default.url(forUbiquityContainerIdentifier:)`, reads the file, returns `{ data, etag }` where `etag` is synthesized from `NSFileVersion.currentVersionOfItem(at:).persistentIdentifier` (or a content SHA-256 if the version identifier is unstable across devices).
- `putFile(relativePath, data, ifMatchEtag?)` → uses `NSFileCoordinator.coordinate(writingItemAt:options:.forReplacing, ...)` to atomically write; before writing, re-reads the current etag and compares against `ifMatchEtag`; mismatch raises `EtagMismatchError`. After write, returns the new synthesized etag.
- `listFiles(relativeDir)` → enumerates the directory inside the ubiquity container via `FileManager`, returns name/etag/size for each. Triggers `startDownloadingUbiquitousItem` for non-resident files so subsequent `getFile` calls have local data.
- `deleteFile(relativePath)` → coordinated delete.

Config plugin (`app.plugin.js` inside the `cloud-sync` package):

- Adds the iCloud container identifier to the iOS section.
- Adds `com.apple.developer.icloud-container-identifiers` and `com.apple.developer.icloud-services = ['CloudDocuments']` to the iOS entitlements.
- Registers `NSUbiquitousContainers` in `Info.plist` with the human-visible name "Liblib" so the folder labels correctly in Files.app.

`EnableSyncSheet`'s iCloud button:

- Pre-flight: call `FileManager.default.ubiquityIdentityToken`. If `nil`, surface "iCloud not available — sign into iCloud in iOS Settings" and do not enable.
- On success, persist `cloud.provider = 'apple'`. No tokens to store (entitlement-based access).

Disabling sync for iCloud users simply clears AsyncStorage; nothing to revoke.

This slice is **HITL** because it requires:

- Provisioning an iCloud container in the Apple Developer portal.
- Updating `app.config.ts` with the container identifier (decision-driven by the human user since it affects the bundle id).
- Running `expo prebuild --clean --platform ios` and verifying entitlements are picked up.
- Verifying end-to-end against two real iOS devices signed into the same iCloud account.

## Acceptance criteria

- [ ] `ICloudAdapter` implements all four `CloudAdapter` methods against the ubiquity container, mapping to the `Liblib/` user-visible folder.
- [ ] Config plugin shipped inside `packages/cloud-sync` and exported via `app.plugin.js`; consumed from the app's `app.config.ts`.
- [ ] After `expo prebuild --clean --platform ios`, the entitlements file contains the iCloud container id and `CloudDocuments` service.
- [ ] Etag synthesis is consistent enough that an unchanged file produces the same etag on a re-list (`NSFileVersion` ID or content-SHA fallback verified across devices).
- [ ] Tapping the iCloud button on a device without an iCloud account surfaces the clear "iCloud not available" message and does NOT set `cloud.provider`.
- [ ] On two real iOS devices signed into the same iCloud account, enabling sync on the second device pulls the cloud db + covers from the first and the library appears.
- [ ] A concurrent write race produces `EtagMismatchError` and triggers the engine's 3-retry behavior.
- [ ] Settings "Sync" section displays "Synced with iCloud" and last-sync timestamp.
- [ ] `npx expo prebuild --clean --platform ios --no-install` succeeds; iOS build runs on device.

### Human-only prerequisites (must be done before merging)

- [ ] iCloud container `iCloud.<bundle-id>` provisioned in the Apple Developer portal.
- [ ] Container identifier added to `app.config.ts`.
- [ ] Manually tested with two real iOS devices on the same iCloud account.

## Blocked by

- `./sync-ui-and-state.md`
