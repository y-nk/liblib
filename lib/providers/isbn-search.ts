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

    const titleMatch = html.match(/<div class="bookinfo">\s*<h1>([^<]+)<\/h1>/)
    const title = titleMatch?.[1]?.trim()

    if (!title) {
      return []
    }

    const imgMatch = html.match(/<div class="image">\s*<img src="([^"]+)"/)
    const coverUrl = imgMatch?.[1] || ''

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
