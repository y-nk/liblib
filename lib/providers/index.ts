import type { Book, ProviderId } from '../types'
import { AI_PROVIDERS } from '../types'
import { getSettings } from '../data/settings'
import { log } from '../log'
import * as openLibrary from './open-library'
import * as googleBooks from './google-books'
import * as openai from './openai'
import * as gemini from './gemini'
import * as isbnSearch from './isbn-search'
import * as amazon from './amazon'
import * as cultura from './cultura'
import * as kinokuniya from './kinokuniya'

export { openLibrary, googleBooks, openai, gemini, isbnSearch, amazon, cultura, kinokuniya }

const providerMap: Record<ProviderId, { getBookFromISBN: (isbn: string) => Promise<Book[]> }> = {
  openLibrary,
  googleBooks,
  isbnSearch,
  amazon,
  cultura,
  kinokuniya,
  openai,
  gemini,
}

export async function lookupISBN(isbn: string) {
  const { providers } = await getSettings()

  const freeProviders = providers.filter((p) => p.enabled && !AI_PROVIDERS.includes(p.id))
  const aiProviders = providers.filter((p) => p.enabled && AI_PROVIDERS.includes(p.id))

  log.info(
    'lookup',
    `ISBN ${isbn} — ${freeProviders.length} free, ${aiProviders.length} AI providers`,
  )

  const start = Date.now()

  // Launch all free providers in parallel
  const freeResults = await Promise.all(
    freeProviders.map((p) => providerMap[p.id].getBookFromISBN(isbn).catch(() => [] as Book[])),
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

  // No free results → fall back to AI providers sequentially
  for (const p of aiProviders) {
    log.info('lookup', `trying AI provider ${p.id}`, { isbn })

    const results = await providerMap[p.id].getBookFromISBN(isbn)

    if (results.length > 0) {
      log.info('lookup', `AI ${p.id} returned ${results.length} results`, { isbn })

      return results
    }
  }

  log.warn('lookup', `no results from any provider`, { isbn })

  return []
}
