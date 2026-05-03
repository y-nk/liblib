import type { Book } from '../types'
import { getDb } from '../db'
import { deleteCover } from '../covers'
import { bookRowSchema, metadataSchema } from '../schemas'

function rowToBook(row: unknown): Book {
  const r = bookRowSchema.parse(row)
  const meta = metadataSchema.parse(r.metadata ? JSON.parse(r.metadata) : {})
  const tags = JSON.parse(r.tags) as string[]

  return {
    isbn: r.isbn,
    title: r.title,
    cover: r.cover,
    tags,
    ...(r.note ? { note: r.note } : {}),
    ...(r.favorite ? { favorite: true } : {}),
    createdAt: new Date(r.createdAt),
    ...(r.updatedAt != null ? { updatedAt: new Date(r.updatedAt) } : {}),
    ...(r.syncedAt != null ? { syncedAt: new Date(r.syncedAt) } : {}),
    ...(r.collectionId != null ? { collectionId: r.collectionId } : {}),
    ...(meta.coverUrl ? { coverUrl: meta.coverUrl } : {}),
  }
}

async function insert(db: Awaited<ReturnType<typeof getDb>>, book: Book) {
  const metadata = JSON.stringify(book.coverUrl ? { coverUrl: book.coverUrl } : {})
  const tags = JSON.stringify(book.tags ?? [])

  await db.runAsync(
    'INSERT OR REPLACE INTO books (isbn, title, cover, tags, note, favorite, createdAt, updatedAt, syncedAt, collectionId, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      book.isbn,
      book.title,
      book.cover ?? '',
      tags,
      book.note ?? '',
      book.favorite ? 1 : 0,
      book.createdAt.getTime(),
      book.updatedAt ? book.updatedAt.getTime() : null,
      book.syncedAt ? book.syncedAt.getTime() : null,
      book.collectionId ?? null,
      metadata,
    ],
  )
}

export async function getBooks() {
  const db = await getDb()
  const rows = await db.getAllAsync(
    'SELECT isbn, title, cover, tags, note, favorite, createdAt, updatedAt, syncedAt, collectionId, metadata FROM books ORDER BY createdAt DESC',
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

export async function toggleFavorite(isbn: string) {
  const db = await getDb()

  await db.runAsync(
    'UPDATE books SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE isbn = ?',
    [isbn],
  )
}

export async function updateBookCover(isbn: string, cover: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET cover = ?, updatedAt = ? WHERE isbn = ?', [
    cover,
    Date.now(),
    isbn,
  ])
}

export async function updateBookTitle(isbn: string, title: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET title = ?, updatedAt = ? WHERE isbn = ?', [
    title,
    Date.now(),
    isbn,
  ])
}

export async function updateBookNote(isbn: string, note: string) {
  const db = await getDb()

  await db.runAsync('UPDATE books SET note = ?, updatedAt = ? WHERE isbn = ?', [
    note,
    Date.now(),
    isbn,
  ])
}

export async function removeBook(isbn: string) {
  const db = await getDb()
  await db.runAsync('DELETE FROM books WHERE isbn = ?', [isbn])
  deleteCover(isbn)
}
