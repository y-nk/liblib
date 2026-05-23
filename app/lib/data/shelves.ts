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

export async function createShelf(name: string) {
  const db = await getDb()
  const result = await db.runAsync('INSERT INTO shelves (name) VALUES (?)', [name])

  return { id: result.lastInsertRowId, name }
}
