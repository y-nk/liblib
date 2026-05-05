import type { z } from 'zod'
import type { bookSchema, providerIdSchema, providerConfigSchema, settingsSchema } from './schemas'

export type Book = z.infer<typeof bookSchema>
export type ProviderId = z.infer<typeof providerIdSchema>
export type ProviderConfig = z.infer<typeof providerConfigSchema>
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: 'isbnSearch', enabled: true },
  { id: 'amazon', enabled: true },
  { id: 'openLibrary', enabled: true },
  { id: 'googleBooks', enabled: true },
  { id: 'cultura', enabled: true },
  { id: 'kinokuniya', enabled: true },
  { id: 'gemini', enabled: false },
  { id: 'openai', enabled: false },
]
