import { log } from '../log'

export async function getBookFromISBN(isbn: string) {
  const tag = 'googleBooks'

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    const start = Date.now()

    const res = await fetch(url)
    const duration = Date.now() - start

    if (!res.ok) {
      log.error(tag, `HTTP ${res.status} in ${duration}ms`, { isbn })

      return []
    }

    const data = await res.json()
    const item = data.items?.[0]?.volumeInfo

    if (!item?.title) {
      log.info(tag, `no match in ${duration}ms`, { isbn })

      return []
    }

    const rawCoverUrl = item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail
    const coverUrl = rawCoverUrl ? rawCoverUrl.replace('http://', 'https://') : undefined

    log.info(tag, `found: ${item.title} in ${duration}ms`, { isbn, coverUrl: coverUrl || '(none)' })

    return [
      {
        isbn,
        title: item.title,
        cover: '',
        coverUrl,
        provider: 'googleBooks' as const,
        tags: [],
        createdAt: new Date(),
      },
    ]
  } catch (e) {
    log.error(tag, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

    return []
  }
}
