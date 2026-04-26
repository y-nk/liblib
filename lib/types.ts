export type Book = {
  isbn: string
  title: string
  cover: string // file:// URI of the cover on disk; '' if none
  coverUrl?: string // remote URL, used as the source to download from
  provider?: ProviderId
  tags: string[]
  note?: string
  favorite?: boolean
  createdAt: Date
  updatedAt?: Date
  syncedAt?: Date
  collectionId?: string
}

export type ProviderId =
  | 'openLibrary'
  | 'googleBooks'
  | 'isbnSearch'
  | 'amazon'
  | 'openai'
  | 'gemini'

export type ProviderConfig = {
  id: ProviderId
  enabled: boolean
}

export type Settings = {
  openaiKey: string
  geminiKey: string
  providers: ProviderConfig[]
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  { id: 'isbnSearch', enabled: true },
  { id: 'amazon', enabled: true },
  { id: 'openLibrary', enabled: true },
  { id: 'googleBooks', enabled: true },
  { id: 'gemini', enabled: false },
  { id: 'openai', enabled: false },
]

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openLibrary: 'Open Library',
  googleBooks: 'Google Books',
  isbnSearch: 'ISBN Search',
  amazon: 'Amazon',
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
