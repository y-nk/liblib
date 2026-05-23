import type { Book } from '../types'
import { getDb } from '../db'
import { deleteCover } from '../covers'
import { bookRowSchema } from '../schemas'

function rowToBook(row: unknown) {
  return bookRowSchema.parse(row)
}

async function insert(db: Awaited<ReturnType<typeof getDb>>, book: Book) {
  const metadata = JSON.stringify(book.coverUrl ? { coverUrl: book.coverUrl } : {})
  const tags = JSON.stringify(book.tags ?? [])

  await db.runAsync(
    'INSERT OR REPLACE INTO books (isbn, shelfId, title, cover, tags, note, createdAt, updatedAt, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      book.isbn,
      book.shelfId ?? null,
      book.title,
      book.cover ?? '',
      tags,
      book.note ?? '',
      book.createdAt.getTime(),
      book.updatedAt ? book.updatedAt.getTime() : null,
      metadata,
    ],
  )
}

export async function getBooks(shelfId?: string) {
  const db = await getDb()
  const rows = await db.getAllAsync(
    shelfId
      ? "SELECT isbn, shelfId, title, cover, tags, note, createdAt, updatedAt, json_extract(metadata, '$.coverUrl') AS coverUrl FROM books WHERE shelfId = ? ORDER BY createdAt DESC"
      : "SELECT isbn, shelfId, title, cover, tags, note, createdAt, updatedAt, json_extract(metadata, '$.coverUrl') AS coverUrl FROM books WHERE shelfId IS NULL ORDER BY createdAt DESC",
    shelfId ? [shelfId] : [],
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

export async function updateBookCover(isbn: string, shelfId: string | null, cover: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET cover = ?, updatedAt = ? WHERE isbn = ? AND shelfId IS ?', [
    cover,
    Date.now(),
    isbn,
    shelfId,
  ])
}

export async function updateBookTitle(isbn: string, shelfId: string | null, title: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET title = ?, updatedAt = ? WHERE isbn = ? AND shelfId IS ?', [
    title,
    Date.now(),
    isbn,
    shelfId,
  ])
}

export async function updateBookNote(isbn: string, shelfId: string | null, note: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET note = ?, updatedAt = ? WHERE isbn = ? AND shelfId IS ?', [
    note,
    Date.now(),
    isbn,
    shelfId,
  ])
}

export async function getBookCount(shelfId: string | undefined) {
  const db = await getDb()
  const row = await db.getFirstAsync<{ count: number }>(
    shelfId
      ? 'SELECT COUNT(*) as count FROM books WHERE shelfId = ?'
      : 'SELECT COUNT(*) as count FROM books WHERE shelfId IS NULL',
    shelfId ? [shelfId] : [],
  )

  return row?.count ?? 0
}

export async function removeBook(isbn: string, shelfId: string | null) {
  const db = await getDb()
  await db.runAsync('DELETE FROM books WHERE isbn = ? AND shelfId IS ?', [isbn, shelfId])
  deleteCover(isbn)
}
