import type { Book } from '../types'

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
    if (!res.ok) {
      return []
    }
    const data = await res.json()
    const item = data.items?.[0]?.volumeInfo
    if (!item?.title) {
      return []
    }

    const rawCoverUrl = item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail
    const coverUrl = rawCoverUrl ? rawCoverUrl.replace('http://', 'https://') : undefined

    return [{ isbn, title: item.title, cover: '', coverUrl, createdAt: new Date() }]
  } catch (e) {
    console.log('[google-books]', e)
    return []
  }
}
