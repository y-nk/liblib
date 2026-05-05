import { parse } from 'node-html-parser'
import type { HTMLElement } from 'node-html-parser'
import type { ProviderId } from '../types'
import { log } from '../log'
import { Provider } from './provider'

export class DomProvider extends Provider {
  constructor(
    id: string,
    name: string,
    private urlTemplate: string,
    private getTitle: (doc: HTMLElement) => string | undefined,
    private getCover: (doc: HTMLElement) => string | undefined,
  ) {
    super(id, name)
  }

  async getBookFromISBN(isbn: string) {
    try {
      const url = this.urlTemplate.replace('{isbn}', isbn)
      const start = Date.now()

      log.info(this.id, `fetching ${url}`)

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
        log.error(this.id, `HTTP ${res.status} in ${duration}ms`, { isbn, status: res.status })

        return []
      }

      const html = await res.text()

      log.info(this.id, `got ${html.length} bytes in ${duration}ms`, { isbn })

      const doc = parse(html)
      const title = this.getTitle(doc)?.trim()

      if (!title) {
        const bodyStart = html.indexOf('<body')
        const bodyContent = bodyStart >= 0 ? html.slice(bodyStart) : html

        log.warn(this.id, 'title selector returned nothing — dumping body', {
          isbn,
          bodySnippet: bodyContent.slice(0, 3000),
        })

        return []
      }

      const coverUrl = this.getCover(doc)?.trim() || ''

      log.info(this.id, `found: ${title}`, {
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
          provider: this.id as ProviderId,
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
