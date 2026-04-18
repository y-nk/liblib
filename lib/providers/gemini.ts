import type { Book } from '../types'
import { getSettings } from '../data/settings'

export async function getBookFromISBN(isbn: string): Promise<Book[]> {
  try {
    const { geminiKey } = await getSettings()
    if (!geminiKey) {
      console.log('[gemini] no API key configured')
      return []
    }

    const prompt = `I have a book with ISBN ${isbn}. Search the web for this ISBN to find the exact book.

If you find a confirmed match, return a JSON array with 1 object.
If you're not sure, return 2-4 best guesses as a JSON array.

Each object must have "title" (string) and "cover" (URL to the book cover image).
Every entry MUST have a cover image URL — skip entries without one.
No markdown, no explanation, just the JSON array.
If you can't find anything, return []`

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
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`)
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const arrMatch = text.match(/\[[\s\S]*\]/)
    if (!arrMatch) {
      return []
    }
    const arr = JSON.parse(arrMatch[0])
    if (!Array.isArray(arr) || arr.length === 0) {
      return []
    }

    return arr
      .filter((item: any) => item.title && item.cover)
      .map((item: any) => ({
        isbn,
        title: item.title,
        cover: '',
        coverUrl: item.cover,
        provider: 'gemini' as const,
        createdAt: new Date(),
      }))
  } catch (e) {
    console.log('[gemini]', e)
    return []
  }
}
