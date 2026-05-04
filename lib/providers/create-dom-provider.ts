import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import type { ProviderId } from '../types'
import { log } from '../log'

type DomProviderConfig = {
  id: ProviderId
  urlTemplate: string
  getTitle: (doc: HTMLElement) => string | undefined
  getCover: (doc: HTMLElement) => string | undefined
}

export function createDomProvider(config: DomProviderConfig) {
  return async function getBookFromISBN(isbn: string) {
    const tag = config.id

    try {
      const url = config.urlTemplate.replace('{isbn}', isbn)
      const start = Date.now()

      log.info(tag, `fetching ${url}`)

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          Accept: 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })

      const duration = Date.now() - start

      if (!res.ok) {
        log.error(tag, `HTTP ${res.status} in ${duration}ms`, { isbn, status: res.status })

        return []
      }

      const html = await res.text()

      log.info(tag, `got ${html.length} bytes in ${duration}ms`, { isbn })

      const doc = parse(html)
      const title = config.getTitle(doc)?.trim()

      if (!title) {
        log.warn(tag, 'title selector returned nothing — dumping body', {
          isbn,
          bodySnippet: html.slice(0, 2000),
        })

        return []
      }

      const coverUrl = config.getCover(doc)?.trim() || ''

      log.info(tag, `found: ${title}`, {
        isbn,
        coverUrl: coverUrl || '(none)',
        duration,
      })

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
      log.error(tag, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

      return []
    }
  }
}
