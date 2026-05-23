import { getDb } from '../db'

export type Shelf = {
  id: number
  name: string
}

export async function getShelves() {
  const db = await getDb()
  const rows = await db.getAllAsync<Shelf>('SELECT id, name FROM shelves ORDER BY id ASC')

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
  const result = await db.runAsync('INSERT INTO shelves (name) VALUES (?)', [name])

  return { id: result.lastInsertRowId, name }
}

export async function updateShelfName(id: number, name: string) {
  const db = await getDb()
  await db.runAsync('UPDATE shelves SET name = ? WHERE id = ?', [name, id])
}

export async function deleteShelf(id: number) {
  const db = await getDb()
  await db.runAsync('UPDATE books SET shelfId = NULL WHERE shelfId = ?', [String(id)])
  await db.runAsync('DELETE FROM shelves WHERE id = ?', [id])
}
