## Parent

`../README.md`

## What to build

Make the long-press "auto-sync lock" gesture from the `sync-ui-and-state` slice actually do something. When `cloud.autoLocked === true`, a single foreground timer runs `SyncEngine.sync()` every 120 seconds — pulling and pushing unconditionally, regardless of whether local changes exist (matches the user-confirmed semantics).

Implementation:

1. **Timer ownership.** Register the interval in `app/_layout.tsx` so it lives for the lifetime of the app's foreground session. Clear on:
   - Unmount of `_layout` (app shutdown).
   - `cloud.provider` becoming `undefined` (sync disabled).
   - `cloud.autoLocked` becoming `false`.
2. **Foreground only.** Use the `AppState` listener; if the app is backgrounded, stop the timer; if it returns to foreground while locked, restart it.
3. **Concurrency guard.** If a sync is already in flight (manual or previous tick), skip this tick — do not stack syncs.
4. **Error policy.** If an auto-sync fails, surface the same red-icon flash + snackbar as a manual failure, then keep the timer running. Repeated consecutive failures (≥3) should temporarily back off (e.g. raise the interval to 10 minutes) until the next manual sync succeeds, to avoid a snackbar storm.
5. **Visual feedback.** The `SyncButton`'s auto-locked dot/badge already exists from the `sync-ui-and-state` slice — make sure it stays in sync with the actual timer state (e.g. dim or hide the dot during back-off).

This slice deliberately stays small. It is the layer that turns the long-press gesture from a UI state toggle into an actual recurring behavior.

## Acceptance criteria

- [ ] `app/_layout.tsx` registers a 120s interval that calls `SyncEngine.sync()` when `cloud.autoLocked` is true and sync is configured.
- [ ] Toggling `cloud.autoLocked` off (long-press again) stops the timer within 1 tick.
- [ ] Disabling sync entirely stops the timer.
- [ ] Backgrounding the app stops the timer; foregrounding it resumes (if still locked).
- [ ] A sync already in flight prevents the next tick from starting a second sync.
- [ ] Three consecutive failures back off to 10 minutes; a subsequent successful sync resets to 120s.
- [ ] Manual sync (tap) while auto-locked still works and does not interfere with the recurring timer.
- [ ] Verified by setting the interval to 10s temporarily in dev, observing repeated sync runs, then restoring 120s.
- [ ] `pnpm format && pnpm lint && npx tsc --noEmit && npx expo export --platform android` all pass.

## Blocked by

- `./sync-ui-and-state.md`
