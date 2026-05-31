## Parent

`../README.md`

## What to build

Replace the `'fake'` placeholder in `EnableSyncSheet`'s "Sync with Google Drive" button with a real implementation that:

1. Triggers Google sign-in **with** the `https://www.googleapis.com/auth/drive.appdata` scope (using `GoogleSignin.signIn({ scopes: [...] })` or `addScopes` on top of the existing minimal sign-in, whichever the lib supports cleanly in the installed version).
2. On success, persists `cloud.provider = 'google'` plus the access token blob and the user's email.
3. Constructs and returns a configured `GoogleDriveAdapter` that implements `CloudAdapter` against the Google Drive REST API in `appDataFolder` scope.

`GoogleDriveAdapter` covers:
- `getFile(path)` → Drive `files.list` filtered to `appDataFolder` parent, find by name, then `files.get?alt=media`; capture the `etag` response header.
- `putFile(path, data, ifMatchEtag?)` → Drive `files.create` (multipart) on first write, `files.update` on subsequent writes using `If-Match` with the stored etag; map Drive's 412 Precondition Failed to `EtagMismatchError`.
- `listFiles(dir)` → `files.list` filtered by parent (where `dir` is mapped to the parent file id — `appDataFolder` for root, a sub-folder file id for `covers/`); ensure the `covers/` folder file is auto-created on first push.
- `deleteFile(path)` → `files.delete`.

Token expiry: the adapter must transparently refresh via `GoogleSignin.getTokens()` on 401. Persist refreshed tokens back to `cloud.tokens`.

Disabling sync must call `GoogleSignin.revokeAccess()` (best-effort, swallow errors) before clearing AsyncStorage.

This slice is **HITL** because it requires:
- Adding `https://www.googleapis.com/auth/drive.appdata` to the OAuth consent screen on Google Cloud Console (by the human user).
- Verifying the sign-in + scope-grant flow against a real Google account on a real device.

## Acceptance criteria

- [ ] `GoogleDriveAdapter` implements all four `CloudAdapter` methods against `appDataFolder`.
- [ ] `EnableSyncSheet`'s Drive button performs sign-in **with** the `drive.appdata` scope; user sees the Drive consent screen on first run.
- [ ] On a fresh install on a second device, enabling sync downloads the existing `liblib.db` + `covers/` from `appDataFolder` and restores the library locally.
- [ ] `putFile` uses `If-Match` semantics, and a concurrent push from a second device causes the first device to retry up to 3 times and surface `SyncConflictError` on the 4th.
- [ ] 401 from Drive triggers a silent token refresh via `GoogleSignin.getTokens()`; the sync transparently retries.
- [ ] Disable sync calls `GoogleSignin.revokeAccess()` then clears all `cloud.*` AsyncStorage keys.
- [ ] Settings "Sync" section displays the actual signed-in Google email and last-sync timestamp.
- [ ] Manually verified on a real Android device and a real iOS device, both signed into different Google accounts.
- [ ] `pnpm format && pnpm lint && npx tsc --noEmit && npx expo export --platform android` all pass.

### Human-only prerequisite (must be done before merging)

- [ ] `https://www.googleapis.com/auth/drive.appdata` registered in the OAuth consent screen for the project's web client ID on Google Cloud Console.

## Blocked by

- `./sync-ui-and-state.md`
