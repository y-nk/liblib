import { z } from 'zod'

export const providerIdSchema = z.enum([
  'openLibrary',
  'googleBooks',
  'isbnSearch',
  'amazon',
  'cultura',
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
  coverUrl: z.string().optional(),
  provider: providerIdSchema.optional(),
  tags: z.array(z.string()),
  note: z.string().optional(),
  favorite: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  syncedAt: z.date().optional(),
  collectionId: z.string().optional(),
})

export const bookRowSchema = z.object({
  isbn: z.string(),
  title: z.string(),
  cover: z.string(),
  tags: z.string(),
  note: z.string(),
  favorite: z.number(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  syncedAt: z.number().nullable(),
  collectionId: z.string().nullable(),
  metadata: z.string(),
})

export const metadataSchema = z.object({
  coverUrl: z.string().optional(),
})
