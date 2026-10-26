import { z } from 'zod';
import { DisplayNameSchema, LanguageCodeSchema, UserRoleSchema } from './common';

const PasswordSchema = z.string().min(8, 'password must be at least 8 characters').max(200);

export const SecurityAnswerSchema = z.object({
  id: z.number().int(),
  answer: z.string().min(1).max(200),
});

export const RegisterEmailSchema = z.object({
  loginType: z.literal('Site'),
  email: z.string().email().toLowerCase().max(100),
  password: PasswordSchema,
  nickname: z.string().min(1).max(50),
  firstname: z.string().max(50).optional().default(''),
  lastname: z.string().max(50).optional().default(''),
  displayName: DisplayNameSchema,
  language: LanguageCodeSchema,
  role: UserRoleSchema.optional(),
  answers: z.array(SecurityAnswerSchema).length(2),
});
export type RegisterEmailInput = z.infer<typeof RegisterEmailSchema>;

export const LoginEmailSchema = z.object({
  loginType: z.literal('Site'),
  email: z.string().email().toLowerCase().max(100),
  password: PasswordSchema,
});
export type LoginEmailInput = z.infer<typeof LoginEmailSchema>;

export const LoginGoogleSchema = z.object({
  loginType: z.literal('Google'),
  id_token: z.string().min(10),
  id: z.string().min(1),
});
export type LoginGoogleInput = z.infer<typeof LoginGoogleSchema>;

export const LoginFacebookSchema = z.object({
  loginType: z.literal('Facebook'),
  access_token: z.string().min(10),
  language: LanguageCodeSchema,
});
export type LoginFacebookInput = z.infer<typeof LoginFacebookSchema>;

export const LoginInputSchema = z.discriminatedUnion('loginType', [
  LoginEmailSchema,
  LoginGoogleSchema,
  LoginFacebookSchema,
]);
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().max(100),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  password: PasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const SessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
});
export type SessionUser = z.infer<typeof SessionUserSchema>;
