import { log } from '../log'

export async function getBookFromISBN(isbn: string) {
  const tag = 'openLibrary'

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`
    const start = Date.now()

    const res = await fetch(url)
    const duration = Date.now() - start

    if (!res.ok) {
      log.error(tag, `HTTP ${res.status} in ${duration}ms`, { isbn })

      return []
    }

    const data = await res.json()
    const entry = data[`ISBN:${isbn}`]

    if (!entry?.title) {
      log.info(tag, `no match in ${duration}ms`, { isbn })

      return []
    }

    const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`

    log.info(tag, `found: ${entry.title} in ${duration}ms`, { isbn })

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
    log.error(tag, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

    return []
  }
}
