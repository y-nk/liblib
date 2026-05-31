import { nanoid } from 'nanoid/non-secure'
import { getDb } from '../db'

export type Shelf = {
  id: string
  name: string
  syncedAt: number | null
}

export async function getShelves() {
  const db = await getDb()
  const rows = await db.getAllAsync<Shelf>(
    'SELECT id, name, syncedAt FROM shelves ORDER BY name ASC',
  )

  return rows
}

export async function getShelfName(shelfId: string | null | undefined) {
  if (!shelfId) {
    return 'Mis-shelved books'
  }

  const db = await getDb()
  const row = await db.getFirstAsync<{ name: string }>('SELECT name FROM shelves WHERE id = ?', [
    shelfId,
  ])

  return row?.name ?? 'Mis-shelved books'
}

export async function createShelf(name: string) {
  const db = await getDb()
  const id = nanoid()
  await db.runAsync('INSERT INTO shelves (id, name) VALUES (?, ?)', [id, name])

  return { id, name }
}

export async function updateShelfName(id: string, name: string) {
  const db = await getDb()
  await db.runAsync('UPDATE shelves SET name = ? WHERE id = ?', [name, id])
}

export async function deleteShelf(id: string) {
  const db = await getDb()
  await db.runAsync('UPDATE books SET shelfId = NULL WHERE shelfId = ?', [id])
  await db.runAsync('DELETE FROM shelves WHERE id = ?', [id])
}
