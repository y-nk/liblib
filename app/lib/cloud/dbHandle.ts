import {
  defaultDatabaseDirectory,
  deserializeDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite'
import { File, Paths } from 'expo-file-system'
import type { DbHandle, SqliteDb, SqliteSession } from '@y_nk/react-native-cloud-sync'
import { runMigrations } from '../migrations'

const DB_NAME = 'liblib.db'

function dbDir() {
  const dir = defaultDatabaseDirectory ?? Paths.document.uri

  // expo-sqlite reports `defaultDatabaseDirectory` as a bare filesystem path
  // (e.g. /data/.../files/SQLite on Android), but the expo-file-system `File`
  // API requires an absolute `file://` URI — without the scheme it throws
  // "URI is not absolute". Normalize so both agree on the same location.
  return dir.startsWith('file://') ? dir : `file://${dir}`
}

async function bindSession(db: SQLiteDatabase) {
  const session = await db.createSessionAsync()
  await session.attachAsync(null)
  await session.enableAsync(true)

  return session
}

/**
 * Adapts the app's singleton `SQLiteDatabase` to the engine's
 * structural `DbHandle` surface. Owns the open/close/swap lifecycle.
 *
 * The returned object includes `release()` which the caller invokes
 * after `sync()` completes so the app's `getDb()` singleton can be
 * re-pointed at the freshly-reopened connection.
 */
export async function buildDbHandle(): Promise<{
  handle: DbHandle
  /** The freshly-opened db after sync; the caller should replace the singleton with this. */
  getCurrentDb: () => SQLiteDatabase
}> {
  const { getDb, replaceDb } = await import('../db')
  const db = await getDb()
  const session = await bindSession(db)
  let current: SQLiteDatabase = db
  let currentSession: SqliteSession = session as unknown as SqliteSession

  const handle: DbHandle = {
    db: current as unknown as SqliteDb,
    session: currentSession,

    async deserialize(data: Uint8Array) {
      const mem = await deserializeDatabaseAsync(data)

      return mem as unknown as SqliteDb
    },

    async swapAndReopen(merged: Uint8Array) {
      const dir = dbDir()

      await current.closeAsync()

      const reopen = async () => {
        const db = await openDatabaseAsync(DB_NAME)
        // Re-run migrations so the freshly-opened db has the app's expected
        // schema_version row; the merged bytes already carry the version,
        // but running migrations is idempotent.
        await runMigrations(db)
        const session = await bindSession(db)

        current = db
        currentSession = session as unknown as SqliteSession
        replaceDb(db)

        return db
      }

      try {
        // expo-sqlite runs in WAL mode, leaving `-wal`/`-shm` sidecars next to
        // the db. Dropping fresh bytes into `liblib.db` while a stale WAL
        // lingers makes the next open replay it on top of the new file and
        // corrupt it — so remove all three before writing.
        for (const name of [DB_NAME, `${DB_NAME}-wal`, `${DB_NAME}-shm`]) {
          const sidecar = new File(dir, name)

          if (sidecar.exists) {
            sidecar.delete()
          }
        }

        const file = new File(dir, DB_NAME)
        file.create()
        file.write(merged)
      } catch (e) {
        // Staging the merged bytes failed after we already closed the live
        // connection. Reopen so the app's singleton is never left pointing at
        // a closed handle (which would surface as "Access to closed resource"
        // on the next sync), then surface the original error.
        await reopen()

        throw e
      }

      const reopened = await reopen()

      return {
        db: reopened as unknown as SqliteDb,
        session: currentSession,
      }
    },
  }

  return {
    handle,
    getCurrentDb: () => current,
  }
}
