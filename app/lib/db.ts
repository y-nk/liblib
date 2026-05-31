import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { runMigrations } from './migrations'

let dbPromise: Promise<SQLiteDatabase> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('liblib.db').then(async (db) => {
      await runMigrations(db)

      return db
    })
  }

  return dbPromise
}

/**
 * Replace the singleton db connection. Used by the sync engine after it
 * swaps the on-disk file and reopens; all subsequent `getDb()` calls
 * should resolve to the new connection.
 */
export function replaceDb(db: SQLiteDatabase) {
  dbPromise = Promise.resolve(db)
}
