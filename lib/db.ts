import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'

let dbPromise: Promise<SQLiteDatabase> | null = null

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('liblib.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS books (
          isbn         TEXT PRIMARY KEY,
          title        TEXT NOT NULL,
          cover        TEXT NOT NULL DEFAULT '',
          createdAt    INTEGER NOT NULL,
          syncedAt     INTEGER,
          collectionId TEXT,
          metadata     TEXT NOT NULL DEFAULT '{}'
        );
        CREATE INDEX IF NOT EXISTS idx_books_collectionId ON books(collectionId);
      `)
      return db
    })
  }
  return dbPromise
}
