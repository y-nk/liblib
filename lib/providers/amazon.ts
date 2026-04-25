import { parse } from 'node-html-parser'
import type { Book } from '../types'

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const url = `https://www.amazon.com/s?rh=p_66%3A${isbn}&ref=sr_adv_b`

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

    const title = doc
      .querySelector('[data-cy="title-recipe"] h2')
      ?.getAttribute('aria-label')
      ?.trim()

    if (!title) {
      return []
    }

    const coverUrl = doc.querySelector('.s-product-image img.s-image')?.getAttribute('src') || ''

    return [
      {
        isbn,
        title,
        cover: '',
        coverUrl: coverUrl || undefined,
        provider: 'amazon',
        createdAt: new Date(),
      },
    ]
  } catch (e) {
    console.log('[amazon]', e)

    return []
  }
}
