import type { Book } from '../types'
import { getDb } from '../db'
import { deleteCover } from '../covers'

type BookRow = {
  isbn: string
  title: string
  cover: string
  tags: string
  createdAt: number
  syncedAt: number | null
  collectionId: string | null
  metadata: string
}

function rowToBook(row: BookRow): Book {
  const meta = row.metadata ? JSON.parse(row.metadata) : {}
  const tags = row.tags ? JSON.parse(row.tags) : []

  return {
    isbn: row.isbn,
    title: row.title,
    cover: row.cover,
    tags,
    createdAt: new Date(row.createdAt),
    ...(row.syncedAt != null ? { syncedAt: new Date(row.syncedAt) } : {}),
    ...(row.collectionId != null ? { collectionId: row.collectionId } : {}),
    ...(meta.coverUrl ? { coverUrl: meta.coverUrl } : {}),
  }
}

async function insert(db: Awaited<ReturnType<typeof getDb>>, book: Book) {
  const metadata = JSON.stringify(book.coverUrl ? { coverUrl: book.coverUrl } : {})
  const tags = JSON.stringify(book.tags ?? [])

  await db.runAsync(
    'INSERT OR REPLACE INTO books (isbn, title, cover, tags, createdAt, syncedAt, collectionId, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      book.isbn,
      book.title,
      book.cover ?? '',
      tags,
      book.createdAt.getTime(),
      book.syncedAt ? book.syncedAt.getTime() : null,
      book.collectionId ?? null,
      metadata,
    ],
  )
}

export async function getBooks(): Promise<Book[]> {
  const db = await getDb()
  const rows = await db.getAllAsync<BookRow>(
    'SELECT isbn, title, cover, tags, createdAt, syncedAt, collectionId, metadata FROM books ORDER BY createdAt DESC',
  )
  return rows.map(rowToBook)
}

export async function saveBooks(books: Book[]) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM books')
    for (const b of books) {
      await insert(db, b)
    }
  })
}

export async function addBook(book: Book) {
  const db = await getDb()
  await insert(db, book)
}

export async function removeBook(isbn: string) {
  const db = await getDb()
  await db.runAsync('DELETE FROM books WHERE isbn = ?', [isbn])
  deleteCover(isbn)
}
