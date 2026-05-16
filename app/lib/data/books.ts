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
    'INSERT OR REPLACE INTO books (isbn, title, cover, tags, note, createdAt, updatedAt, syncedAt, collectionId, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      book.isbn,
      book.title,
      book.cover ?? '',
      tags,
      book.note ?? '',
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
    "SELECT isbn, title, cover, tags, note, createdAt, updatedAt, syncedAt, collectionId, json_extract(metadata, '$.coverUrl') AS coverUrl FROM books ORDER BY createdAt DESC",
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
