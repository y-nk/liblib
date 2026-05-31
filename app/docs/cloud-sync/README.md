# Cloud Sync

## Problem Statement

I use liblib on more than one device. Today every device has its own SQLite database and its own folder of cover images. If I add a book on my phone, my tablet doesn't know about it. If I reinstall the app, every shelf, every book, every cover I painstakingly curated is gone. There is no backup and no way to move data across devices.

I want my library to follow me. I don't want to run a server. I don't want a subscription. I already pay Google and Apple for cloud storage; I want the app to use that.

## Solution

The app gets an opt-in sync feature that backs up the whole local SQLite database and the entire cover image folder to the user's own cloud storage:

- On Android, Google Drive (hidden `appDataFolder`, app-private).
- On iOS, either iCloud Drive (visible `Liblib/` folder inside iCloud Drive) or Google Drive — user picks at enable-time.

Sync is **manual by default**: a refresh icon in the books screen header runs sync on demand. Long-pressing the icon locks an auto-sync mode that pulls + pushes every two minutes while the app is open. The user controls when their data moves.

When two devices have edited the same row between syncs, the last device to push wins — the previously-saved value on the cloud is overwritten. This is acceptable because the same human owns both devices and rarely edits the same field on both within minutes.

The cloud sync engine is built as a separate package (`packages/cloud-sync`) so it can later be extracted into a vanilla React Native library (`@y_nk/react-native-cloud-sync`).

## User Stories

1. As a phone user, I want to add a book on my phone and see it on my tablet after sync, so that my library is the same everywhere.
2. As a multi-device user, I want one global on/off switch for sync, so that I don't have to think about which shelves are synced.
3. As a privacy-minded user, I want my data to live in my own Google Drive or iCloud, so that no third-party server holds my library.
4. As an Android user, I want my backup files to be hidden from my Drive UI, so that I don't accidentally move or delete them.
5. As an iOS user, I want my backup files to appear in iCloud Drive under a `Liblib/` folder, so that I can see them in the Files app and trust the backup is real.
6. As a user with both an Android phone and an iPad, I want to pick Google Drive on both, so that one cloud holds everything.
7. As a new user opening the app for the first time, I want sync to be off by default, so that nothing leaves my device without my consent.
8. As a user who never enables sync, I want the app to behave exactly like it does today, so that the new feature doesn't impose any cost on me.
9. As a user enabling sync for the first time on iOS, I want to choose between Google Drive and iCloud, so that I can pick whichever I trust more.
10. As a user enabling sync for the first time on Android, I want Google Drive to be the only option, so that I'm not confused by an unavailable iCloud choice.
11. As a user enabling sync, I want to sign in and grant cloud-storage permission in one flow, so that I don't have to do auth twice.
12. As an iOS user, I want Sign in with Apple to be offered alongside Google, so that the app complies with App Store guidelines.
13. As a user, I want a single dedicated refresh icon in the header to trigger sync, so that I don't have to hunt through settings for it.
14. As a user actively editing my library, I want to long-press the refresh icon to lock auto-sync on, so that my changes go up regularly without me thinking about it.
15. As a user with auto-sync locked, I want a visible indicator on the icon (filled with a dot), so that I can tell at a glance that auto-sync is on.
16. As a user, I want auto-sync to pull as well as push every two minutes when locked, so that my idle tablet stays current with my phone.
17. As a user, I want the refresh icon to rotate in place while a sync is running, so that I can see something is happening.
18. As a user, I want to see "Last synced: X minutes ago" inside Settings, so that I can verify sync is working without running it.
19. As a user, I want a "Sync now" action visible in Settings as well, so that I have an alternative entry point if I disable the header icon someday.
20. As a user, I want a successful sync to be silent — no toast, no banner — so that the UI doesn't nag me.
21. As a user, I want a failed sync to surface as a brief red icon and a snackbar with a reason, so that I know something went wrong without it being a modal.
22. As a user, I want my cover images to sync along with my book data, so that my tablet shows the covers I picked, not blanks.
23. As a user who changes a book's cover on phone, I want my local choice preserved if the cloud version differs, so that I don't lose my edit to a stale cloud copy.
24. As a returning user reinstalling the app, I want to enable sync and have my books, shelves, and covers pulled from cloud, so that reinstalling is not data loss.
25. As a user with both phone and tablet, when I enable sync on the second device, I want my local books merged on top of the cloud copy rather than wiped, so that pre-sync local edits aren't lost.
26. As a user, when two devices race to push at the same time, I want my device to retry up to three times and then surface a snackbar, so that transient races resolve themselves without my help.
27. As a user, I want to disable sync from Settings, so that I can stop sync without uninstalling the app.
28. As a user disabling sync, I want my cloud data to stay intact in case I re-enable later, so that I don't accidentally destroy my backup.
29. As a user, I want disabling sync to also revoke the Google access token, so that the app no longer has permission to my Drive after I opt out.
30. As a user creating a new shelf on two devices before the first sync, I want both shelves to survive the merge, so that I don't lose a shelf to an autoincrement-id collision.
31. As a user updating the app, I want a newer device to refuse to overwrite an older device's local data, so that I'm warned to update before I corrupt anything.
32. As a user on an iOS device without an active iCloud account, when I pick iCloud, I want to see a clear "iCloud not available" message pointing me to iOS Settings, so that I'm not stuck.
33. As a user pressing the sync icon while signed-out, I want the enable-sync sheet to appear instead of an error, so that the icon is also the on-ramp to sync.
34. As a user, I want sync to never block the UI, so that I can keep scrolling and editing while it runs.
35. As a user, I want pending local edits to be safe even if a sync runs at the same time, so that I never lose work to a race between my edit and the sync.
36. As a developer, I want the cloud-sync code to live in `packages/cloud-sync` behind a stable interface, so that I can later extract it into a standalone OSS package.

## Implementation Decisions

### Architecture

- **Peer model, not master/slave.** Both device and cloud are peers. The device holds the working copy; the cloud holds the shared rendezvous file. "Sync" means pull → merge → push.
- **Whole-database sync.** A single SQLite file (`liblib.db`) is the unit of sync. No per-shelf opt-in. `shelves.syncedAt` becomes a diagnostic-only column.
- **Manual primary trigger.** Sync runs only when the user taps the refresh icon, or when auto-sync mode is locked on (long-press toggle), in which case it pulls + pushes every two minutes regardless of whether local changes exist.
- **No foreground/background/post-write triggers in MVP.**

### Cloud layout

```
<cloud root>/
  liblib.db
  covers/
    <isbn>.jpg
```

- On Google Drive: `<cloud root>` is the app's `appDataFolder` (hidden, scoped to the app, requires `drive.appdata` OAuth scope only).
- On iCloud: `<cloud root>` is the app's ubiquity container, surfaced as a `Liblib/` folder in iCloud Drive.

### Sync engine (Approach A — single-file merge)

The engine uses the SQLite session/changeset extension that ships with `expo-sqlite@16` to capture local edits as a replayable blob:

1. **Capture.** Before sync, the engine asks the running session to produce a changeset blob containing every local write since the previous sync.
2. **Pull.** Download the cloud `liblib.db` to a temporary file. If no cloud file exists yet, skip pull (this is Case A — fresh cloud).
3. **Merge.** Apply the local changeset to the downloaded db. Conflict policy is whatever the native `expo-sqlite` binding hardcodes, which is `SQLITE_CHANGESET_REPLACE` — incoming/local row replaces existing/cloud row on collision. Net effect: the side applying its own changeset last wins.
4. **Swap.** Close the open db connection, replace the local `liblib.db` file with the merged temp file, reopen, start a fresh session.
5. **Push.** Upload the new merged db back to the cloud, using the cloud provider's etag / if-match equivalent. If the upload returns an etag mismatch (another device pushed during the window), retry from step 2 up to 3 times. On the 4th failure, abort and surface a "Sync conflict, try again" snackbar.
6. **Covers.** After the db merge succeeds, diff the local and remote `covers/` folders by filename. Upload covers present locally but not remotely. Download covers present remotely but not locally. On filename collisions, local wins (no content comparison).

### First-sync handshake

- **Case A — cloud empty.** Upload local db as-is. Local becomes the bootstrap.
- **Case B — cloud has data and local has data.** Merge: treat the entire local row set as a changeset and apply on top of the downloaded cloud db. Push merged result. No data loss on either side, but possible PK collisions (see schema prerequisite below).
- **Case C — etag race during push.** Retry the full pull-merge-push loop up to 3 times. On the 4th attempt, surface a snackbar.

### Schema prerequisite (must ship in the same release)

- **Migration 9: convert `shelves.id` from `INTEGER AUTOINCREMENT` to nanoid `TEXT`.** Without this, two devices independently creating shelves will collide on `id=1`, `id=2`, etc., and the changeset merge will silently overwrite one device's shelf with the other's.
- `books.shelfId TEXT` references must be migrated alongside (they already store id as text, but contents need rewriting to point at the new nanoid values).
- New entities introduced in the future use nanoid by convention.
- `schema_version` table value travels with the db. The engine refuses to apply a downloaded db whose `schema_version` is higher than the local app's known max migration — abort with an "Update app" error. This protects an older device from a newer device's incompatible schema.

### Cloud adapter package — `packages/cloud-sync`

Future-extractable into `@y_nk/react-native-cloud-sync`. Module layout:

- **`CloudAdapter` interface (deep module).** Stable surface across providers:
  - `getFile(path): Promise<{ data: Uint8Array, etag: string } | null>`
  - `putFile(path, data, options?: { ifMatchEtag?: string }): Promise<{ etag: string }>` — throws a typed `EtagMismatchError` on conflict.
  - `listFiles(dir): Promise<{ name: string, etag: string, size: number }[]>`
  - `deleteFile(path): Promise<void>`
- **`GoogleDriveAdapter`** — implements `CloudAdapter` over Google Drive's REST API against `appDataFolder`. OAuth token obtained from `@react-native-google-signin/google-signin`'s `getTokens()`. Etag from Drive's response headers.
- **`ICloudAdapter`** — implements `CloudAdapter` over an iCloud ubiquity container. Requires a custom Expo config plugin and native module — there is no off-the-shelf RN library that is being relied upon. This is the largest native-side risk in the project. Etag is synthesized from `NSFileVersion` + content hash since iCloud doesn't expose HTTP etags.
- **`SyncEngine` (deep module).** One public entry point: `sync({ db, adapter, coverDir }): Promise<SyncResult>`. Owns the 5-step flow above, the session lifecycle, the temp-file swap, and the retry-on-conflict logic.
- **`AuthGate`.** Encapsulates the sign-in + scope-grant flow per provider. Returns a configured `CloudAdapter` or throws a typed error: `UserCancelled`, `NoICloudAccount`, `ScopeDenied`, `MissingEntitlement`.

### App-side wiring

- **`app/lib/cloud/state.ts`** — AsyncStorage facade. Keys: `cloud.provider` (`'google' | 'apple' | undefined`), `cloud.tokens` (provider-specific), `cloud.lastSyncAt`, `cloud.autoLocked`, `cloud.deviceId` (nanoid, generated once), `cloud.lastEtag`.
- **`components/SyncButton.tsx`** — new component, rendered in `headerRight` of `app/books.tsx` next to the existing gear icon. States: idle (RefreshCw outline), syncing (icon rotates in place via `Animated`), auto-locked (filled icon + small dot/badge). Gestures: tap = run sync; long-press = toggle auto-sync lock. Tap while sync state is `undefined` (signed-out) opens the EnableSyncSheet instead.
- **`components/sheets/EnableSyncSheet.tsx`** — new sheet. Two buttons: "Sync with Google Drive" (always shown) and "Sync with iCloud" (iOS only). Both run their provider's sign-in + scope-grant flow and persist `cloud.provider` on success. Sign in with Apple is offered separately on iOS per App Store 4.8, but it does not select iCloud as the sync provider — provider selection is its own button.
- **`components/sheets/SettingsSheet.tsx`** (modified) — remove the existing identity-only Sign-in section (Google + Apple buttons + signed-in user card). Add a "Sync" section visible only when `cloud.provider` is set: provider name + email + last-sync timestamp + "Sync now" diagnostic action + "Disable sync" destructive action. Disabling clears all `cloud.*` AsyncStorage keys and calls `GoogleSignin.signOut()` / token revoke as applicable; cloud files remain untouched.

### Auto-sync semantics

When `cloud.autoLocked === true`, a timer set in `app/_layout.tsx` runs `SyncEngine.sync()` every 120 seconds while the app is mounted. Pulls + pushes unconditionally. The timer is cleared on unmount, when sync is disabled, and when the lock is toggled off.

### What is explicitly **not** in this PRD

See "Out of Scope" below.

## Testing Decisions

### What makes a good test for this feature

- **Test external behavior, not implementation details.** A test should assert "after sync, the cloud file contains both books" — not "the session attach method was called once."
- **Hit a real local SQLite (in-memory) rather than mocking the db.** Real schema, real migrations, real session extension.
- **Mock the cloud at the `CloudAdapter` interface, not below it.** The fake adapter is an in-memory map of `path -> { data, etag }`. This is the only mock we need; everything above runs for real.
- **Tests are scenario-based, not method-based.** Each test reads like a story: "Device A adds book X. Sync. Device B starts empty, syncs. Device B sees book X."

### Modules covered by tests

- **`SyncEngine`** — primary test surface. Scenarios:
  - First-ever sync (Case A) uploads local to empty cloud.
  - Second-device sync (Case B) merges local books on top of cloud books.
  - Concurrent push (Case C) triggers etag-mismatch retry; passes after 1 retry; fails after 4.
  - Cover diff uploads new local covers and downloads new remote covers.
  - Cover collision: local wins, remote not overwritten on local.
  - Schema version refusal: cloud db with `schema_version` greater than local raises typed error and aborts.
  - Round-trip: write on virtual device A → sync → wipe device A → re-sync → state restored.
- **Migration 9 (nanoid)** — unit test against an in-memory SQLite seeded with pre-migration data:
  - Shelves with integer ids become shelves with nanoid string ids.
  - Books pointing at old integer ids now point at the corresponding new nanoid ids.
  - Mis-shelved books (NULL `shelfId`) remain NULL.
  - Idempotency: running the migration twice is a no-op.

### Modules **not** covered by automated tests (verify by hand)

- **`GoogleDriveAdapter`** — requires real Drive credentials, real network. Verify by signing in on a real device, running sync, inspecting `appDataFolder` via the Drive API explorer.
- **`ICloudAdapter`** — requires a real iCloud account, real entitlements, real device (simulator iCloud is unreliable). Verify by enabling sync on two iOS devices signed into the same iCloud account.
- **`AuthGate`** — OAuth and entitlement flows are integration-shaped; brittle to mock. Verify by hand on real devices, including the failure paths (cancel, no iCloud, scope denied).
- **`SyncButton`** UI states — visual; verify by hand.

### Prior art in the codebase

There is no existing test suite at the time of writing. This feature introduces both the testing pattern and the test runner setup. Adopt:

- **`vitest`** (or `jest` if already configured by `expo-router`/Expo) as the test runner; whichever the rest of the Expo ecosystem prefers at the time of implementation.
- **`expo-sqlite`'s in-memory mode** (`openDatabaseAsync(':memory:')`) for the SQLite-backed tests.
- A small `FakeCloudAdapter` helper in `packages/cloud-sync/test/`, implementing `CloudAdapter` as an in-memory `Map<string, { data, etag }>`. Etag bumps a counter on every `putFile`.

## Out of Scope

- **Changeset log / git-like cloud history.** The cloud holds one canonical db file plus covers. No append-only `changes/` log, no compaction. Revisit if multi-device contention becomes a real problem.
- **Compaction.** Same reason.
- **Orphan cover garbage collection.** When a book is removed, its cover in the cloud is left behind. Acceptable; addressable in a future janitor task.
- **Background sync via `expo-background-task` / `expo-task-manager`.** Auto-sync runs only while the app is in the foreground.
- **Schema-version cloud file.** The `schema_version` table inside the db itself is enough for MVP; a separate cloud-side file is deferred.
- **Sharing shelves between users.** Not in scope. The whole-db model assumes one human owns all devices and shelves.
- **Per-shelf opt-in.** Whole-db sync only.
- **Cross-provider data migration.** If a user enables sync with Google Drive and later wants to switch to iCloud, they will have to manually disable + re-enable; the app does not transfer files between providers.
- **Conflict UI.** No diff viewer, no "this row was overwritten" notification. Sync conflicts (etag races) surface only as a generic "try again" snackbar after retry exhaustion. Field-level conflicts (last-pusher-wins) are silent.
- **Encryption at rest in the cloud.** Files live in the user's own Drive/iCloud, which provide encryption at rest by the provider. The app does not add an extra encryption layer.
- **Mobile-to-web sync.** No web client exists; not a consideration.
- **Server-side anything.** The sync model is 100% mobile-to-cloud. No server is introduced, modified, or assumed by this PRD.

## Further Notes

### Prerequisites the developer must complete outside the codebase

These are blocking for the feature to actually work on a real device, and cannot be done from code:

1. **Google Cloud Console** — add `https://www.googleapis.com/auth/drive.appdata` to the OAuth consent screen's registered scopes for this app's web client ID.
2. **Apple Developer portal** — provision an iCloud container (e.g., `iCloud.com.ynk.liblib`).
3. **`app.config.ts`** — wire the iCloud container identifier into the iOS section and add the `com.apple.developer.icloud-container-identifiers` entitlement. Rerun `expo prebuild --clean --platform ios` to verify the entitlement is picked up.
4. **Both providers** — verify a clean install on each platform actually completes the sign-in + scope grant flow end-to-end before the feature is considered done.

### Known sharp edges

- **`SQLITE_CHANGESET_REPLACE` is hardcoded** in `expo-sqlite`'s native binding (both `ios/SQLiteModule.swift` and `android/.../NativeSessionBinding.cpp` return it unconditionally from their conflict callbacks). There is no JS-side knob. If we later want true LWW-by-timestamp we would need to fork or replace the binding. Acceptable for this feature.
- **AsyncStorage is the source of truth for "have I applied this etag."** If AsyncStorage is wiped (rare — usually only on uninstall or a user explicitly clearing app data), the device will re-pull the cloud db and re-merge. Because `REPLACE` semantics are idempotent for UPDATEs, this is mostly safe; the edge case is a deleted-then-recreated row, which can resurrect.
- **iCloud has no real etag.** The `ICloudAdapter` will need to synthesize one from `NSFileVersion` identifiers + a content hash. This is non-trivial and is the biggest implementation risk in the iCloud adapter.
- **`expo-sqlite` v16's session extension** is exposed in JS but the wrapper does not expose iteration over a changeset blob. The blob is opaque from JS. We cannot, for example, log "here are the rows about to be applied" before applying. Accept this; it is a sync engine, not a diff viewer.
