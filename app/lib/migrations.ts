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
  {
    version: 5,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS shelves (
          id   INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `)
    },
  },
  {
    version: 6,
    up: async (db) => {
      await db.execAsync(`ALTER TABLE books RENAME COLUMN collectionId TO shelfId`)
    },
  },
  {
    version: 7,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE books_new (
          isbn      TEXT NOT NULL,
          shelfId   TEXT,
          title     TEXT NOT NULL,
          cover     TEXT NOT NULL DEFAULT '',
          tags      TEXT NOT NULL DEFAULT '[]',
          note      TEXT NOT NULL DEFAULT '',
          favorite  INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER,
          syncedAt  INTEGER,
          metadata  TEXT NOT NULL DEFAULT '{}',
          PRIMARY KEY (isbn, shelfId)
        );

        INSERT INTO books_new (isbn, shelfId, title, cover, tags, note, favorite, createdAt, updatedAt, syncedAt, metadata)
          SELECT isbn, shelfId, title, cover, tags, note, favorite, createdAt, updatedAt, syncedAt, metadata FROM books;

        DROP TABLE books;
        ALTER TABLE books_new RENAME TO books;
      `)
    },
  },
  {
    version: 8,
    up: async (db) => {
      await db.execAsync(`ALTER TABLE shelves ADD COLUMN syncedAt INTEGER`)

      await db.execAsync(`
        CREATE TABLE books_v8 (
          isbn      TEXT NOT NULL,
          shelfId   TEXT,
          title     TEXT NOT NULL,
          cover     TEXT NOT NULL DEFAULT '',
          tags      TEXT NOT NULL DEFAULT '[]',
          note      TEXT NOT NULL DEFAULT '',
          favorite  INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER,
          metadata  TEXT NOT NULL DEFAULT '{}',
          PRIMARY KEY (isbn, shelfId)
        );

        INSERT INTO books_v8 (isbn, shelfId, title, cover, tags, note, favorite, createdAt, updatedAt, metadata)
          SELECT isbn, shelfId, title, cover, tags, note, favorite, createdAt, updatedAt, metadata FROM books;

        DROP TABLE books;
        ALTER TABLE books_v8 RENAME TO books;
      `)
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
