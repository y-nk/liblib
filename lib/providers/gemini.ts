import { getSettings } from '../data/settings'
import { log } from '../log'

export async function getBookFromISBN(isbn: string) {
  const tag = 'gemini'

  try {
    const { geminiKey } = await getSettings()

    if (!geminiKey) {
      log.warn(tag, 'no API key configured')

      return []
    }

    const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book.

If you find a confirmed match, return a JSON array with 1 object.
If you're not sure, return 2-4 best guesses as a JSON array.

Each object must have "title" (string) and "cover" (URL to the book cover image).
Every entry MUST have a cover image URL — skip entries without one.
No markdown, no explanation, just the JSON array.
If you can't find anything, return []`

    const start = Date.now()

    log.info(tag, `searching for ISBN ${isbn}`)

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
        }),
      },
    )

    const duration = Date.now() - start

    if (!res.ok) {
      const body = await res.text().catch(() => '')

      log.error(tag, `HTTP ${res.status} in ${duration}ms`, { isbn, body: body.slice(0, 1000) })

      return []
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const arrMatch = text.match(/\[[\s\S]*\]/)

    if (!arrMatch) {
      log.warn(tag, `no JSON array in response in ${duration}ms`, {
        isbn,
        responseSnippet: text.slice(0, 500),
      })

      return []
    }

    const arr = JSON.parse(arrMatch[0])

    if (!Array.isArray(arr) || arr.length === 0) {
      log.info(tag, `empty results in ${duration}ms`, { isbn })

      return []
    }

    const results = arr
      .filter((item: any) => item.title && item.cover)
      .map((item: any) => ({
        isbn,
        title: item.title,
        cover: '',
        coverUrl: item.cover,
        provider: 'gemini' as const,
        tags: [],
        createdAt: new Date(),
      }))

    log.info(tag, `found ${results.length} results in ${duration}ms`, { isbn })

    return results
  } catch (e) {
    log.error(tag, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

    return []
  }
}
