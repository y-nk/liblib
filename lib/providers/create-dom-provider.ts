import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import type { Book, ProviderId } from '../types'

type DomProviderConfig = {
  id: ProviderId
  urlTemplate: string
  getTitle: (doc: HTMLElement) => string | undefined
  getCover: (doc: HTMLElement) => string | undefined
}

export function createDomProvider(config: DomProviderConfig) {
  return async function getBookFromISBN(isbn: string): Promise<Book[]> {
    try {
      const url = config.urlTemplate.replace('{isbn}', isbn)

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      if (!res.ok) {
        return []
      }

      const html = await res.text()
      const doc = parse(html)

      const title = config.getTitle(doc)?.trim()

      if (!title) {
        return []
      }

      const coverUrl = config.getCover(doc)?.trim() || ''

      return [
        {
          isbn,
          title,
          cover: '',
          coverUrl: coverUrl || undefined,
          provider: config.id,
          tags: [],
          createdAt: new Date(),
        },
      ]
    } catch (e) {
      console.log(`[${config.id}]`, e)

      return []
    }
  }
}
