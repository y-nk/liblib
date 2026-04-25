import type { Book } from '../types'

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`,
    )
    if (!res.ok) {
      return []
    }
    const data = await res.json()
    const entry = data[`ISBN:${isbn}`]
    if (!entry?.title) {
      return []
    }

    const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`

    return [
      {
        isbn,
        title: entry.title,
        cover: '',
        coverUrl,
        provider: 'openLibrary',
        tags: [],
        createdAt: new Date(),
      },
    ]
  } catch (e) {
    console.log('[open-library]', e)
    return []
  }
}
