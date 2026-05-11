import type { SQLiteDatabase } from 'expo-sqlite'

type Migration = {
  version: number
  up: (db: SQLiteDatabase) => Promise<void>
}

const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
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
    },
  },
  {
    version: 2,
    up: async (db) => {
      await db.execAsync(`ALTER TABLE books ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'`)
    },
  },
  {
    version: 3,
    up: async (db) => {
      await db.execAsync(`ALTER TABLE books ADD COLUMN updatedAt INTEGER`)
    },
  },
  {
    version: 4,
    up: async (db) => {
      await db.execAsync(`ALTER TABLE books ADD COLUMN note TEXT NOT NULL DEFAULT ''`)
      await db.execAsync(`ALTER TABLE books ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0`)
    },
  },
]

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`)

  const row = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_version')
  let current = row?.version ?? 0

  for (const m of migrations) {
    if (m.version > current) {
      await m.up(db)
      current = m.version
    }
  }

  if (row) {
    await db.runAsync('UPDATE schema_version SET version = ?', [current])
  } else {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [current])
  }
}
