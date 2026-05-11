import { log } from '../log'
import { Provider } from './provider'

export class GoogleBooksProvider extends Provider {
  constructor() {
    super('googleBooks', 'Google Books')
  }

  async getBookFromISBN(isbn: string) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      const start = Date.now()

      const res = await fetch(url)
      const duration = Date.now() - start

      if (!res.ok) {
        log.error(this.id, `HTTP ${res.status} in ${duration}ms`, { isbn })

        return []
      }

      const data = await res.json()
      const item = data.items?.[0]?.volumeInfo

      if (!item?.title) {
        log.info(this.id, `no match in ${duration}ms`, { isbn })

        return []
      }

      const rawCoverUrl = item.imageLinks?.thumbnail || item.imageLinks?.smallThumbnail
      const coverUrl = rawCoverUrl ? rawCoverUrl.replace('http://', 'https://') : undefined

      log.info(this.id, `found: ${item.title} in ${duration}ms`, {
        isbn,
        coverUrl: coverUrl || '(none)',
      })

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
      log.error(this.id, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

      return []
    }
  }
}
