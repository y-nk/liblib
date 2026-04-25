import { parse } from 'node-html-parser'
import type { Book } from '../types'

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const res = await fetch(`https://isbnsearch.org/isbn/${isbn}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0',
        Accept: 'text/html',
      },
    })

    if (!res.ok) {
      return []
    }

    const html = await res.text()
    const doc = parse(html)

    const title = doc.querySelector('div.bookinfo h1')?.textContent?.trim()

    if (!title) {
      return []
    }

    const coverUrl = doc.querySelector('div.image img')?.getAttribute('src') || ''

    return [
      {
        isbn,
        title,
        cover: '',
        coverUrl: coverUrl || undefined,
        provider: 'isbnSearch',
        createdAt: new Date(),
      },
    ]
  } catch (e) {
    console.log('[isbn-search]', e)

    return []
  }
}
