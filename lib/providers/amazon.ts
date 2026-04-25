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

    const titleMatch = html.match(
      /data-cy="title-recipe"[^>]*>[\s\S]*?<h2[^>]*aria-label="([^"]+)"/,
    )
    const title = titleMatch?.[1]?.trim()

    if (!title) {
      return []
    }

    const imgBlock = html.match(/s-product-image[\s\S]*?<img([^>]*)>/)
    const imgAttrs = imgBlock?.[1] || ''
    const srcMatch = imgAttrs.match(/src="([^"]+)"/)
    const hasImageClass = imgAttrs.includes('s-image')
    const coverUrl = hasImageClass && srcMatch ? srcMatch[1] : ''

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
