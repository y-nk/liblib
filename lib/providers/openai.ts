import { getSettings } from '../data/settings'
import { log } from '../log'
import { AiProvider } from './ai-provider'

export class OpenAiProvider extends AiProvider {
  constructor() {
    super('openai', 'OpenAI (GPT-5)', 'openaiKey', 'sk-...')
  }

  async getBookFromISBN(isbn: string) {
    try {
      const { openaiKey } = await getSettings()

      if (!openaiKey) {
        log.warn(this.id, 'no API key configured')

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

      log.info(this.id, `searching for ISBN ${isbn}`)

      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-5',
          tools: [{ type: 'web_search_preview' }],
          input: prompt,
        }),
      })

      const duration = Date.now() - start

      if (!res.ok) {
        const body = await res.text().catch(() => '')

        log.error(this.id, `HTTP ${res.status} in ${duration}ms`, {
          isbn,
          body: body.slice(0, 1000),
        })

        return []
      }

      const data = await res.json()
      const text =
        data.output
          ?.find((o: any) => o.type === 'message')
          ?.content?.find((c: any) => c.type === 'output_text')?.text ?? ''

      const arrMatch = text.match(/\[[\s\S]*\]/)

      if (!arrMatch) {
        log.warn(this.id, `no JSON array in response in ${duration}ms`, {
          isbn,
          responseSnippet: text.slice(0, 500),
        })

        return []
      }

      const arr = JSON.parse(arrMatch[0])

      if (!Array.isArray(arr) || arr.length === 0) {
        log.info(this.id, `empty results in ${duration}ms`, { isbn })

        return []
      }

      const results = arr
        .filter((item: any) => item.title && item.cover)
        .map((item: any) => ({
          isbn,
          title: item.title,
          cover: '',
          coverUrl: item.cover,
          provider: 'openai' as const,
          tags: [],
          createdAt: new Date(),
        }))

      log.info(this.id, `found ${results.length} results in ${duration}ms`, { isbn })

      return results
    } catch (e) {
      log.error(this.id, `exception: ${e instanceof Error ? e.message : String(e)}`, { isbn })

      return []
    }
  }
}
