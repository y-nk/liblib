import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'
import { runMigrations } from './migrations'

let dbPromise: Promise<SQLiteDatabase> | null = null

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('liblib.db').then(async (db) => {
      await runMigrations(db)

      return db
    })
  }

  return dbPromise
}
