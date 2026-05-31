# @y_nk/react-native-cloud-sync

Provider-agnostic SQLite + blob sync for Expo / React Native apps. Pulls a
shared db file from a cloud "drive" provider, replays the device's local
changeset on top, swaps the merged file into place, and pushes back with
optimistic concurrency control. Includes pluggable adapters for Google Drive
(`appDataFolder`) and iCloud Drive (ubiquity container), plus a fake adapter
for in-memory tests.

## What's in the box

```
packages/cloud-sync/
├── src/
│   ├── CloudAdapter.ts        — adapter interface (get/put/list/delete + ETag)
│   ├── SyncEngine.ts          — pull → apply → swap → push with retry loop
│   ├── CoverStore.ts          — host-supplied blob store for jpg/png covers
│   ├── SqliteSurface.ts       — abstract DB / session shape, host-provided
│   ├── errors.ts              — EtagMismatch / NotFound / SchemaTooNew / SyncConflict
│   ├── FakeCloudAdapter.ts    — in-memory adapter, used by tests + dev wiring
│   ├── GoogleDriveAdapter.ts  — Drive REST against appDataFolder
│   └── ICloudAdapter.ts       — wraps the LiblibICloud native module
├── ios/                       — Swift native module + podspec
├── plugin/withICloud.js       — Expo config plugin (entitlements + Info.plist + Podfile)
├── app.plugin.js              — re-exports the plugin so `plugins: ['@y_nk/react-native-cloud-sync']` works
└── test/                      — engine + adapter unit tests (Node)
```

## Engine flow (Approach A)

1. Capture local SQLite changeset.
2. Pull the cloud `liblib.db` (or skip if absent — first device).
3. Apply the captured changeset on top.
4. Swap merged file into the local path, reopen the DB, bind a fresh session.
5. Push with `ifMatchEtag = state.lastEtag`. On `EtagMismatchError`, retry from
   step 2 (up to 3 retries → `SyncConflictError`).
6. Diff covers directory, upload new ones, download missing ones.

The engine refuses to run if the cloud db's `schema_version` exceeds the local
app build's `localSchemaVersion` — surfaces as `SchemaTooNewError` so the host
can prompt the user to upgrade.

## Wiring it up

```ts
import {
  sync,
  GoogleDriveAdapter,
  ICloudAdapter,
  FakeCloudAdapter,
} from '@y_nk/react-native-cloud-sync'

const adapter =
  provider === 'google'
    ? new GoogleDriveAdapter({ getAccessToken })
    : provider === 'apple'
      ? new ICloudAdapter({ native: LiblibICloud })
      : new FakeCloudAdapter()

const result = await sync({ handle, adapter, covers, state, localSchemaVersion: 9 })
```

The host owns:

- `DbHandle` (an open `expo-sqlite` DB + an active changeset session)
- `CoverStore` (read/write/list the local covers dir — `expo-file-system`)
- `SyncState` persistence (just `lastEtag`; AsyncStorage in this app)
- Per-provider auth (token producer for Drive; iCloud sign-in is implicit)

## Provider requirements & HITL steps

### Google Drive

**Code (already shipped)**

- `GoogleDriveAdapter` against `appDataFolder` with multipart upload,
  `If-Match` → `EtagMismatch`, `401` → `getAccessToken(true)` + retry once.
- Host glue lives in `lib/cloud/googleSync.ts` and uses
  `@react-native-google-signin/google-signin` for the token.

**Human steps before it works on a device**

1. In Google Cloud Console, on the project backing your OAuth client:
   - Enable the Drive API: `gcloud services enable drive.googleapis.com`
     (the only CLI-automatable part).
   - OAuth consent screen → add scope
     `https://www.googleapis.com/auth/drive.appdata`.
     No supported gcloud command for this; UI only.
2. If the consent screen is in **External** + **In production**, the
   `drive.appdata` scope is treated as sensitive and requires verification.
   In **Testing** mode with you as a test user, no verification needed.
3. The Android OAuth client must be registered with the app's signing-cert
   SHA-1 fingerprint. Already configured for the debug + release keystores
   on this app.

**Operational notes**

- The adapter uses the per-app hidden `appDataFolder` space — files are
  invisible to the user in `drive.google.com` and don't count against the
  user-visible quota (still capped at the same 15 GB total).
- Tokens come from `GoogleSignin.getTokens()`; the adapter calls back into
  the host with `forceRefresh=true` on a `401`. The host is responsible for
  re-running `getTokens()` and persisting.

### iCloud Drive

**Code (already shipped)**

- `ICloudAdapter` marshals `Uint8Array` ↔ base64 across the RN bridge.
- `ios/LiblibICloud.swift` uses `NSFileCoordinator` + `NSFileVersion` for
  per-file etags (SHA-256 fallback when the version identifier isn't
  exposed). Soft-fails to `ICloudNotAvailableError` when iCloud is signed
  out or the container doesn't resolve.
- `plugin/withICloud.js` is an Expo config plugin that injects the
  entitlement, the `NSUbiquitousContainers` Info.plist block, and the
  Podfile line for the local pod. It's identifier-driven — see below.

**Configuring the container identifier**

The plugin accepts the container id from three sources (highest precedence
first):

1. Plugin props in `app.config.ts`:
   ```ts
   plugins: [['@y_nk/react-native-cloud-sync', { containerIdentifier: 'iCloud.com.your.app' }]]
   ```
2. Env var `LIBLIB_ICLOUD_CONTAINER` at prebuild time.
3. Falls back to `iCloud.com.example.placeholder` so `expo export` and
   `expo prebuild` succeed in CI / dev without a real container provisioned.

The same id flows into both entitlement keys
(`com.apple.developer.icloud-container-identifiers`,
`com.apple.developer.ubiquity-container-identifiers`), the
`NSUbiquitousContainers` Info.plist entry (which controls the "Liblib"
display name in Files.app), and the `LiblibICloudContainerIdentifier`
Info.plist key the Swift module reads at runtime.

**Human steps before it works on a device**

1. **Paid Apple Developer membership** ($99/yr). Required to register iCloud
   containers and produce a signed dev build.
2. Apple Developer Console → Identifiers → register an iCloud Container,
   e.g. `iCloud.com.julien.liblib`. No CLI for this (fastlane covers app
   IDs but not iCloud containers cleanly).
3. Either:
   - Set the plugin prop `containerIdentifier` in `app.config.ts`, or
   - `export LIBLIB_ICLOUD_CONTAINER=iCloud.com.julien.liblib` before
     `npx expo prebuild`.
4. The app's iOS bundle id must have iCloud capability enabled in the
   provisioning profile (Xcode does this automatically when the entitlement
   is present and you sign in with a team that owns the container).
5. Build a custom dev client — `eas build --profile development --platform ios`
   — and run on a device or simulator signed into iCloud. The Swift module
   does **not** work in Expo Go.

**Verification limits**

`expo export --platform android`, `tsc`, `lint`, and `expo prebuild --platform ios`
all pass with the placeholder id. The Swift side can only be validated on a
real dev build. The adapter's `available()` pre-flight surfaces a typed
`ICloudNotAvailableError` if you ship without setting up iCloud properly,
so the failure mode is "Sync with iCloud" button shows an error, not crash.

### Fake adapter

`FakeCloudAdapter` is in-memory, ETag-correct, and exercised by the engine
tests. The host app exposes it behind a dev-only "Run fake sync" button in
`SettingsSheet` (`__DEV__` only) so the engine is demoable before either real
adapter is provisioned.

## Schema versions

The cloud `liblib.db` carries a `schema_version` table. The engine reads it on
pull and:

- `cloud_version > localSchemaVersion` → throw `SchemaTooNewError`. Host
  should refuse to sync and prompt for app upgrade.
- `cloud_version == localSchemaVersion` → normal merge.
- `cloud_version < localSchemaVersion` → migrations run as part of the local
  open path before applying the changeset.

Shelf primary keys are nanoid TEXT (migration 9) — multi-device safe.

## Testing

```sh
pnpm test          # engine + adapter unit tests (no device needed)
pnpm format
pnpm lint
npx tsc --noEmit
npx expo export --platform android
npx expo prebuild --clean --platform ios --no-install   # validates the config plugin
```

## Known limits

- Engine is single-active-sync per adapter instance; concurrent `sync()` calls
  on the same adapter aren't guarded inside the package. The host (see
  `lib/cloud/syncRunner.ts`) coalesces concurrent triggers via an in-flight
  promise guard.
- No incremental db transfer — the whole `liblib.db` is pushed each sync.
  Fine at current scale (single user, <50 MB).
- Covers diff is name-based, not content-hash. Fine because cover filenames
  are derived from the ISBN.
- No mid-sync cancellation. A sync runs to completion or surfaces an error.
