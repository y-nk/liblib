import type { CloudAdapter } from './CloudAdapter'
import type { DbHandle, SqliteDb } from './SqliteSurface'
import { EtagMismatchError, SchemaTooNewError, SyncConflictError } from './errors'

const DB_PATH = 'liblib.db'
const MAX_ATTEMPTS = 4 // Initial attempt + 3 retries.

export type SyncState = {
  /** Last known etag of the cloud db; used as `ifMatchEtag` on push. */
  lastEtag?: string
}

export type SyncResult = {
  pulled: boolean
  pushed: boolean
  retries: number
  newEtag: string
}

export type SyncOptions = {
  handle: DbHandle
  adapter: CloudAdapter
  state: SyncState
  /** Highest migration version this app build knows how to read. */
  localSchemaVersion: number
}

async function readSchemaVersion(db: SqliteDb) {
  const row = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_version')

  return row?.version ?? 0
}

/**
 * Approach-A sync: pull cloud db, apply local changeset, swap merged file
 * into place, push back with optimistic concurrency control on the previously
 * known etag. Retries the entire pull-merge-push loop up to 3 times on etag
 * race; throws `SyncConflictError` on the 4th failure.
 *
 * Side-channel blobs (covers, attachments, …) are out of scope here —
 * compose `syncFiles` for those.
 *
 * Steps:
 *   1. Capture local changeset.
 *   2. Pull cloud db (or skip — Case A).
 *   3. Apply local changeset on top.
 *   4. Swap temp into local path + reopen + fresh session.
 *   5. Push merged db with `ifMatchEtag`; retry on conflict.
 */
export async function sync(opts: SyncOptions): Promise<SyncResult> {
  const { adapter, state, localSchemaVersion } = opts
  let handle = opts.handle
  let retries = 0
  let attempt = 0

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1

    // ---------- Step 1: capture local changeset ------------------------
    // We capture *before* downloading so the changeset only contains the
    // writes this device made between the last sync and now. The session
    // is then closed; a fresh one is bound during the swap (step 4).
    const localChangeset = await handle.session.createChangesetAsync()
    await handle.session.closeAsync()

    // ---------- Step 2: pull cloud db ---------------------------------
    const remote = await adapter.getFile(DB_PATH)
    let mergedBytes: Uint8Array
    let pulled = false

    if (remote === null) {
      // Case A — empty cloud. Local db becomes the bootstrap.
      mergedBytes = await handle.db.serializeAsync()
    } else {
      pulled = true

      // ------- Step 3: apply local changeset on top of remote --------
      const tempDb = await handle.deserialize(remote.data)

      // Schema gate: refuse a remote db whose schema is newer than us.
      const remoteSchema = await readSchemaVersion(tempDb)

      if (remoteSchema > localSchemaVersion) {
        await tempDb.closeAsync()
        // Rebind a session on the still-open local db so the app keeps
        // recording writes after the typed abort surfaces upward.
        const rebound = await handle.db.createSessionAsync()
        await rebound.attachAsync(null)
        await rebound.enableAsync(true)
        handle.session = rebound

        throw new SchemaTooNewError(remoteSchema, localSchemaVersion)
      }

      const tempSession = await tempDb.createSessionAsync()
      // The session apply call doesn't need the session enabled — the
      // changeset is replayed directly against the connection — but
      // expo-sqlite's API exposes apply on the session object.
      await tempSession.applyChangesetAsync(localChangeset)
      await tempSession.closeAsync()

      mergedBytes = await tempDb.serializeAsync()
      await tempDb.closeAsync()
    }

    // ---------- Step 4: swap merged file into the local db path -------
    const swapped = await handle.swapAndReopen(mergedBytes)
    handle = { ...handle, db: swapped.db, session: swapped.session }

    // ---------- Step 5: push merged db with ifMatchEtag ---------------
    try {
      const put = await adapter.putFile(DB_PATH, mergedBytes, {
        ifMatchEtag: state.lastEtag,
      })

      state.lastEtag = put.etag

      return {
        pulled,
        pushed: true,
        retries,
        newEtag: put.etag,
      }
    } catch (e) {
      if (!(e instanceof EtagMismatchError)) {
        throw e
      }

      // Refresh our notion of the cloud etag and retry the whole loop.
      const fresh = await adapter.getFile(DB_PATH)
      state.lastEtag = fresh?.etag

      retries += 1

      if (attempt >= MAX_ATTEMPTS) {
        break
      }

      // Continue the while loop — restart with capture-pull-apply-push.
    }
  }

  throw new SyncConflictError(MAX_ATTEMPTS)
}
