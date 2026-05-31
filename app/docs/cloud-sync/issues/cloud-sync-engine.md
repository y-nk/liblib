## Parent

`../README.md`

## What to build

Create the `packages/cloud-sync` package (future `@y_nk/react-native-cloud-sync`) and implement the provider-agnostic sync engine end-to-end against an in-memory fake cloud adapter. No real Google Drive or iCloud yet — those are separate slices.

Three modules, in increasing depth:

1. **`CloudAdapter` interface.** Stable provider-agnostic surface:
   - `getFile(path)` → `{ data: Uint8Array, etag: string } | null`
   - `putFile(path, data, { ifMatchEtag? })` → `{ etag: string }`; throws `EtagMismatchError` on conflict
   - `listFiles(dir)` → `{ name, etag, size }[]`
   - `deleteFile(path)`

2. **`FakeCloudAdapter`.** In-memory `Map<string, { data, etag }>`. Etag is a monotonic counter bumped on each `putFile`. Used by tests and (in this slice) by the app itself in development, so the engine can be exercised end-to-end before real adapters land.

3. **`SyncEngine` (deep module).** Single entry point: `sync({ db, adapter, coverDir, state }): Promise<SyncResult>`. Implements Approach A:
   1. Capture the running SQLite session as a changeset blob.
   2. Download cloud `liblib.db` to a temp file (if any).
   3. Apply the local changeset on top of the temp db.
   4. Swap the temp file into the local db path; close + reopen the connection; start a fresh session.
   5. Upload the merged db with `ifMatchEtag` on the previously known etag; retry the full pull-merge-push loop up to 3 times on `EtagMismatchError`; surface a typed error on the 4th failure.
   6. Cover diff: list local and remote `covers/`, upload locals-missing-remote, download remotes-missing-local. Local wins on filename collision.

`SyncEngine` also enforces the schema-version refusal gate: before applying the downloaded db, read its `schema_version` table; if higher than the local app's max known migration version, abort with a typed `SchemaTooNewError`.

Wire a temporary debug-only entry point in the app (e.g. a `__DEV__`-guarded button in `SettingsSheet`, or auto-invocation in a dev menu) that runs `SyncEngine.sync()` against the in-memory `FakeCloudAdapter`. This is throwaway scaffolding — it goes away when real adapters land — but it is what makes this slice a real vertical: tap a button, sync runs, data round-trips through a fake cloud.

## Acceptance criteria

- [ ] `packages/cloud-sync` directory exists, with its own `package.json` named `@y_nk/react-native-cloud-sync` (private for now). Configured into the pnpm workspace if one isn't set up; otherwise via path resolution.
- [ ] `CloudAdapter` interface exported with the four methods and typed errors (`EtagMismatchError`, `NotFoundError`).
- [ ] `FakeCloudAdapter` implementation exported, usable from both tests and the dev app.
- [ ] `SyncEngine.sync()` implements all six steps above, including schema-version refusal.
- [ ] `SyncResult` typed and informative: `{ pulled, pushed, coverUploads, coverDownloads, retries }`.
- [ ] Tests covering at minimum:
  - First-ever sync uploads local to empty cloud (Case A).
  - Second-device sync merges local on top of cloud books (Case B).
  - Etag race triggers retry and passes after 1 retry.
  - Etag race fails after 4 attempts with typed `SyncConflictError`.
  - Cover diff uploads new local covers and downloads new remote covers.
  - Cover collision: local wins.
  - Cloud db with `schema_version > local` raises `SchemaTooNewError` and does not modify local.
  - Round-trip restore: write on virtual device A → sync → wipe device A's local db → re-sync → state restored.
- [ ] Dev-only entry point in the app runs `SyncEngine.sync()` against `FakeCloudAdapter` and surfaces the `SyncResult` (toast, console, anything visible) so the engine is demoable.
- [ ] `pnpm format && pnpm lint && npx tsc --noEmit && npx expo export --platform android` all pass.

## Blocked by

- `./nanoid-migration.md`
