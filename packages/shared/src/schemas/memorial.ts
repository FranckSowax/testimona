import { z } from 'zod';
import { LanguageCodeSchema, PaginationSchema, SlugSchema, UuidSchema } from './common';

export const MemorialCreateSchema = z.object({
  firstname: z.string().min(1).max(80),
  lastname: z.string().min(1).max(80),
  nickname: z.string().max(80).optional(),
  birthDate: z.coerce.date().optional(),
  deathDate: z.coerce.date().optional(),
  language: LanguageCodeSchema,
  isPublic: z.boolean().default(true),
  description: z.string().max(2000).optional(),
});
export type MemorialCreateInput = z.infer<typeof MemorialCreateSchema>;

export const MemorialUpdateSchema = MemorialCreateSchema.partial();
export type MemorialUpdateInput = z.infer<typeof MemorialUpdateSchema>;

export const MemorialIdParamSchema = z.object({ memorialId: UuidSchema });
export const MemorialSlugParamSchema = z.object({ slug: SlugSchema });

export const MemorialListQuerySchema = PaginationSchema.extend({
  q: z.string().max(100).optional(),
  language: LanguageCodeSchema.optional(),
  onlyPublic: z.coerce.boolean().default(true),
});
export type MemorialListQuery = z.infer<typeof MemorialListQuerySchema>;

export const TestimonialCreateSchema = z.object({
  memorialId: UuidSchema,
  authorName: z.string().min(1).max(80),
  message: z.string().min(1).max(4000),
  language: LanguageCodeSchema,
});
export type TestimonialCreateInput = z.infer<typeof TestimonialCreateSchema>;

export const ChapterCreateSchema = z.object({
  memorialId: UuidSchema,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(20000),
  position: z.number().int().min(0).default(0),
});
export type ChapterCreateInput = z.infer<typeof ChapterCreateSchema>;

export const PhotoUploadMetaSchema = z.object({
  memorialId: UuidSchema,
  caption: z.string().max(500).optional(),
});
export type PhotoUploadMeta = z.infer<typeof PhotoUploadMetaSchema>;
