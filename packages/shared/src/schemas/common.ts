import { z } from 'zod';

export const AuthenticationModeSchema = z.enum(['Site', 'Google', 'Facebook']);
export type AuthenticationMode = z.infer<typeof AuthenticationModeSchema>;

export const UserRoleSchema = z.enum(['User', 'Admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const DisplayNameSchema = z.enum([
  'NicknameFirstnameLastname',
  'Nickname',
  'FirstnameLastname',
]);
export type DisplayName = z.infer<typeof DisplayNameSchema>;

export const LanguageCodeSchema = z.string().min(2).max(8);

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const UuidSchema = z.string().uuid();
export const SlugSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'invalid slug');
