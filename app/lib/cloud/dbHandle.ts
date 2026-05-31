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

function dbFile() {
  const dir = defaultDatabaseDirectory ?? Paths.document.uri

  return new File(dir, DB_NAME)
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
      await current.closeAsync()

      const file = dbFile()

      if (file.exists) {
        file.delete()
      }

      file.create()
      file.write(merged)

      const reopened = await openDatabaseAsync(DB_NAME)
      // Re-run migrations to make sure the freshly-opened db has the
      // app's expected schema_version row in sync; the merged bytes
      // already carry the version, but running migrations is idempotent.
      await runMigrations(reopened)

      const freshSession = await bindSession(reopened)

      current = reopened
      currentSession = freshSession as unknown as SqliteSession
      replaceDb(reopened)

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
