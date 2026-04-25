import type { Book, ProviderId } from '../types'
import { AI_PROVIDERS } from '../types'
import { getSettings } from '../data/settings'
import * as openLibrary from './open-library'
import * as googleBooks from './google-books'
import * as openai from './openai'
import * as gemini from './gemini'
import * as isbnSearch from './isbn-search'
import * as amazon from './amazon'

export { openLibrary, googleBooks, openai, gemini, isbnSearch, amazon }

const providerMap: Record<ProviderId, { getBookFromISBN: (isbn: string) => Promise<Book[]> }> = {
  openLibrary,
  googleBooks,
  isbnSearch,
  amazon,
  openai,
  gemini,
}

export async function lookupISBN(isbn: string): Promise<Book[]> {
  const { providers } = await getSettings()

  const freeProviders = providers.filter((p) => p.enabled && !AI_PROVIDERS.includes(p.id))
  const aiProviders = providers.filter((p) => p.enabled && AI_PROVIDERS.includes(p.id))

  // Launch all free providers in parallel
  const freeResults = await Promise.all(
    freeProviders.map((p) => providerMap[p.id].getBookFromISBN(isbn).catch(() => [] as Book[])),
  )

  const allBooks = freeResults.flat()

  if (allBooks.length > 0) {
    const withCover = allBooks.filter((b) => b.coverUrl || b.cover)
    const withoutCover = allBooks.filter((b) => !b.coverUrl && !b.cover)

    // Multiple matches with cover → show picker
    if (withCover.length > 1) {
      return withCover
    }

    // Single match with cover → use it
    if (withCover.length === 1) {
      return withCover
    }

    // No cover matches → use first partial match (title only)
    return [withoutCover[0]]
  }

  // No free results → fall back to AI providers sequentially
  for (const p of aiProviders) {
    const results = await providerMap[p.id].getBookFromISBN(isbn)

    if (results.length > 0) {
      return results
    }
  }

  return []
}
