import { z } from 'zod'

export const providerIdSchema = z.enum([
  'openLibrary',
  'googleBooks',
  'isbnSearch',
  'amazon',
  'cultura',
  'kinokuniya',
  'openai',
  'gemini',
])

export const providerConfigSchema = z.object({
  id: providerIdSchema,
  enabled: z.boolean(),
})

export const settingsSchema = z.object({
  openaiKey: z.string(),
  geminiKey: z.string(),
  providers: z.array(providerConfigSchema),
})

export const bookSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  cover: z.string(),
  coverUrl: z.string().nullish(),
  provider: providerIdSchema.optional(),
  tags: z.array(z.string()),
  note: z.string().optional(),
  favorite: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date().nullish(),
  syncedAt: z.date().nullish(),
  collectionId: z.string().nullish(),
})

export const metadataSchema = z.object({
  coverUrl: z.string().optional(),
})

export const bookRowSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  cover: z.string(),
  tags: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(z.array(z.string())),
  note: z.string().optional().default(''),
  favorite: z.coerce.boolean().optional().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().nullish(),
  syncedAt: z.coerce.date().nullish(),
  collectionId: z.string().nullish(),
  coverUrl: z.string().nullish(),
})
