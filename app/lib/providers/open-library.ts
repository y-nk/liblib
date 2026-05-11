import { log } from '../log'
import { Provider } from './provider'

export class OpenLibraryProvider extends Provider {
  constructor() {
    super('openLibrary', 'Open Library')
  }

  async getBookFromISBN(isbn: string) {
    try {
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
      const start = Date.now()

      const res = await fetch(url)
      const duration = Date.now() - start

      if (!res.ok) {
        log.error(this.id, `HTTP ${res.status} in ${duration}ms`, { isbn })

        return []
      }

      const data = await res.json()
      const entry = data[`ISBN:${isbn}`]

      if (!entry?.title) {
        log.info(this.id, `no match in ${duration}ms`, { isbn })

        return []
      }

      const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`

      log.info(this.id, `found: ${entry.title} in ${duration}ms`, { isbn })

      return [
        {
          isbn,
          title: entry.title,
          cover: '',
          coverUrl,
          provider: 'openLibrary' as const,
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
