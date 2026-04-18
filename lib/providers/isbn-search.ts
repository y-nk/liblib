import * as cheerio from 'cheerio'
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
    const $ = cheerio.load(html)

    const title = $('div.bookinfo h1').first().text().trim()

    if (!title) {
      return []
    }

    const coverUrl = $('div.image img').first().attr('src') || ''

    return [{ isbn, title, cover: '', coverUrl: coverUrl || undefined, createdAt: new Date() }]
  } catch (e) {
    console.log('[isbn-search]', e)

    return []
  }
}
