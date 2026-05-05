import type { Book } from '../types'
import { getSettings } from '../data/settings'
import { log } from '../log'
import { AiProvider } from './ai-provider'
import { OpenLibraryProvider } from './open-library'
import { GoogleBooksProvider } from './google-books'
import { IsbnSearchProvider } from './isbn-search'
import { AmazonProvider } from './amazon'
import { CulturaProvider } from './cultura'
import { KinokuniyaProvider } from './kinokuniya'
import { OpenAiProvider } from './openai'
import { GeminiProvider } from './gemini'

export { Provider } from './provider'
export { AiProvider } from './ai-provider'

export const providers = Object.fromEntries(
  [
    new IsbnSearchProvider(),
    new AmazonProvider(),
    new OpenLibraryProvider(),
    new GoogleBooksProvider(),
    new CulturaProvider(),
    new KinokuniyaProvider(),
    new OpenAiProvider(),
    new GeminiProvider(),
  ].map((p) => [p.id, p]),
)

export async function lookupISBN(isbn: string) {
  const { providers: config } = await getSettings()

  const enabled = config
    .filter((p) => p.enabled)
    .map((p) => providers[p.id])
    .filter((p) => !!p)

  const freeProviders = enabled.filter((p) => !(p instanceof AiProvider))
  const aiProviders = enabled.filter((p) => p instanceof AiProvider)

  log.info(
    'lookup',
    `ISBN ${isbn} — ${freeProviders.length} free, ${aiProviders.length} AI providers`,
  )

  const start = Date.now()

  const freeResults = await Promise.all(
    freeProviders.map((p) => p.getBookFromISBN(isbn).catch(() => [] as Book[])),
  )

  const allBooks = freeResults.flat()
  const duration = Date.now() - start

  log.info('lookup', `free providers returned ${allBooks.length} results in ${duration}ms`, {
    isbn,
    providers: freeProviders.map((p) => p.id),
    resultCounts: freeResults.map((r, i) => ({ provider: freeProviders[i].id, count: r.length })),
  })

  if (allBooks.length > 0) {
    const withCover = allBooks.filter((b) => b.coverUrl || b.cover)
    const withoutCover = allBooks.filter((b) => !b.coverUrl && !b.cover)

    if (withCover.length > 1) {
      log.info('lookup', `${withCover.length} matches with cover → picker`, { isbn })

      return withCover
    }

    if (withCover.length === 1) {
      log.info('lookup', `1 match with cover from ${withCover[0].provider}`, { isbn })

      return withCover
    }

    log.info('lookup', `no cover matches, using title-only from ${withoutCover[0]?.provider}`, {
      isbn,
    })

    return [withoutCover[0]]
  }

  for (const p of aiProviders) {
    log.info('lookup', `trying AI provider ${p.id}`, { isbn })

    const results = await p.getBookFromISBN(isbn)

    if (results.length > 0) {
      log.info('lookup', `AI ${p.id} returned ${results.length} results`, { isbn })

      return results
    }
  }

  log.warn('lookup', `no results from any provider`, { isbn })

  return []
}
