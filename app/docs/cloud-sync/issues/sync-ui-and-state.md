## Parent

`../README.md`

## What to build

Stand up all the user-facing surfaces of sync and wire them to the engine from the previous slice. Still no real cloud provider — everything points at `FakeCloudAdapter`. This slice is the moment sync becomes a real feature that a user can see, even if it only round-trips to memory.

Components and changes:

1. **`app/lib/cloud/state.ts`** — AsyncStorage facade for the cloud sub-namespace. Reads/writes:
   - `cloud.provider`: `'google' | 'apple' | 'fake' | undefined` (`'fake'` only in dev)
   - `cloud.deviceId`: nanoid, generated once and frozen
   - `cloud.lastSyncAt`: ISO timestamp
   - `cloud.lastEtag`: string
   - `cloud.autoLocked`: boolean
   - Provider-specific token blobs (kept opaque to the rest of the app)
   When `cloud.provider === undefined`, sync is considered disabled.

2. **`components/SyncButton.tsx`** — new component. Rendered in `headerRight` of `app/books.tsx`, immediately to the left of the existing gear icon. Uses lucide `RefreshCw`. Three visual states:
   - **idle**: outline icon
   - **syncing**: same icon rotating in place via `Animated.Value` (not a separate spinner replacing it)
   - **auto-locked**: filled icon plus a small dot/badge
   Gestures:
   - Tap when `cloud.provider === undefined` → opens `EnableSyncSheet`.
   - Tap when sync is enabled → runs `SyncEngine.sync()` against the currently-configured adapter; rotates icon during; on success returns to idle; on error briefly turns red + surfaces a snackbar.
   - Long-press when sync is enabled → toggles `cloud.autoLocked` (visual state updates; the actual timer lives in the auto-sync-lock slice).

3. **`components/sheets/EnableSyncSheet.tsx`** — new bottom sheet. Two action buttons, both shown on iOS, only the Drive one on Android:
   - **"Sync with Google Drive"** — placeholder in this slice: writes `cloud.provider = 'fake'` and closes. Real Drive wiring lands in a later slice.
   - **"Sync with iCloud"** — placeholder in this slice: same behavior, also `'fake'`. Real iCloud wiring lands in a later slice.
   Sign in with Apple is rendered as an additional button on iOS to satisfy App Store guideline 4.8, but it does NOT select a sync provider; it is informational/identity only in MVP and may be removed if the App Store check turns out not to apply.

4. **`components/sheets/SettingsSheet.tsx`** (modified) — remove the existing identity-only sign-in block (Google + Apple buttons + signed-in user card + sign-out). Replace it with a **"Sync"** section that is conditionally rendered:
   - When `cloud.provider === undefined`: show a single "Enable sync" row that opens `EnableSyncSheet`.
   - When `cloud.provider` is set: show provider name, account email (if known), `cloud.lastSyncAt` as "Last synced: X ago", a "Sync now" diagnostic row, and a "Disable sync" destructive row. Disabling clears all `cloud.*` AsyncStorage keys; cloud files remain untouched. Token revocation (Google) happens in the Google-Drive-adapter slice.

5. **`lib/auth.ts`** — the existing identity-only `signInWithGoogle` / `signInWithApple` / `signOut` / `getUser` are no longer called from anywhere. Either delete the file or keep it for the Drive slice to repurpose, your call. Don't leave dead UI behind.

6. **Snackbar / toast utility** — if no toast lib exists, add one minimal helper (`expo-router` doesn't ship one). Used by sync errors only.

End state of this slice: the user can long-press a button to lock auto-sync state, tap to run a no-op sync against the fake adapter, see "Last synced" update in Settings, and disable sync. None of this talks to a real cloud yet.

## Acceptance criteria

- [ ] `app/lib/cloud/state.ts` exists with the keys listed above and helper getters/setters. `deviceId` is generated once and persisted.
- [ ] `SyncButton` rendered in `app/books.tsx` `headerRight`, to the left of the gear. Idle, syncing (rotating in place), and auto-locked states each visually distinguishable.
- [ ] Tap on `SyncButton` with no provider configured opens `EnableSyncSheet`.
- [ ] Tap on `SyncButton` with `'fake'` provider runs `SyncEngine.sync(FakeCloudAdapter)` and updates `cloud.lastSyncAt`.
- [ ] Long-press on `SyncButton` toggles `cloud.autoLocked` and the visual state updates immediately.
- [ ] `EnableSyncSheet` renders both buttons on iOS, only Drive button on Android. Both currently set `cloud.provider = 'fake'` and close.
- [ ] SettingsSheet's old identity sign-in section is removed; new Sync section appears and reacts to `cloud.provider`.
- [ ] "Disable sync" in SettingsSheet clears all `cloud.*` AsyncStorage keys and returns the UI to the disabled state.
- [ ] Failed sync (e.g. simulate by configuring fake adapter to throw) surfaces as red-icon-flash + snackbar with the error reason.
- [ ] `pnpm format && pnpm lint && npx tsc --noEmit && npx expo export --platform android` all pass.

## Blocked by

- `./cloud-sync-engine.md`
