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

export const metadataSchema = z.object({
  coverUrl: z.string().optional(),
})

export const bookRowSchema = z
  .object({
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
  .transform((r) => {
    const meta = metadataSchema.parse(r.metadata ? JSON.parse(r.metadata) : {})

    return {
      isbn: r.isbn,
      title: r.title,
      cover: r.cover,
      tags: JSON.parse(r.tags) as string[],
      ...(r.note ? { note: r.note } : {}),
      ...(r.favorite ? { favorite: true } : {}),
      createdAt: new Date(r.createdAt),
      ...(r.updatedAt != null ? { updatedAt: new Date(r.updatedAt) } : {}),
      ...(r.syncedAt != null ? { syncedAt: new Date(r.syncedAt) } : {}),
      ...(r.collectionId != null ? { collectionId: r.collectionId } : {}),
      ...(meta.coverUrl ? { coverUrl: meta.coverUrl } : {}),
    }
  })
