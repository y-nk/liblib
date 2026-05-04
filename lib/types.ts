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
  { id: 'gemini', enabled: false },
  { id: 'openai', enabled: false },
]

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openLibrary: 'Open Library',
  googleBooks: 'Google Books',
  isbnSearch: 'ISBN Search',
  amazon: 'Amazon',
  cultura: 'Cultura',
  gemini: 'Gemini',
  openai: 'OpenAI (GPT-5)',
}

export const AI_PROVIDERS: ProviderId[] = ['openai', 'gemini']

export const PROVIDER_KEY_FIELD: Partial<Record<ProviderId, keyof Settings>> = {
  openai: 'openaiKey',
  gemini: 'geminiKey',
}

export const PROVIDER_KEY_PLACEHOLDER: Record<string, string> = {
  openaiKey: 'sk-...',
  geminiKey: 'AIza...',
}
