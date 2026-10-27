import 'server-only';
import { z } from 'zod';
import { localizedPath } from '@/lib/auth/redirect-target';
import { dossierInviteEmail, sendEmail } from '@/lib/email/resend';
import * as repo from './repo';
import { CreateDossierInputSchema, CreateInvitationInputSchema } from './schema';
import { generateInvitationToken, hashInvitationToken } from './tokens';

export type DossierError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'invitation_invalid'
  | 'invitation_expired'
  | 'invitation_used'
  | 'unauthenticated'
  | 'unknown';

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DossierError; fieldErrors?: Record<string, string> };

export interface InvitationContext {
  siteUrl: string;
  locale: string;
  inviterName: string | null;
  personName: string;
}

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

const CODE_TO_ERROR: Record<string, DossierError> = {
  '42501': 'forbidden',
  '23514': 'validation',
  not_found: 'not_found',
  TI001: 'invitation_invalid',
  TI002: 'invitation_expired',
  TI003: 'invitation_used',
  '28000': 'unauthenticated',
};

function fromRepo(error: repo.RepoError, scope: string): { ok: false; error: DossierError } {
  const mapped = CODE_TO_ERROR[error.code];
  if (!mapped) console.error(`[dossier] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function fieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Crée dossier, personne et lien du créateur en une transaction. */
export async function createDossier(raw: unknown): Promise<Result<{ id: string }>> {
  const parsed = CreateDossierInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const res = await repo.insertDossierWithPerson(parsed.data);
  if (res.error) return fromRepo(res.error, 'createDossier');
  return { ok: true, data: { id: res.data } };
}

/**
 * Crée une invitation et renvoie le lien à partager. Le jeton n'existe que dans
 * ce lien ; la base n'en garde que l'empreinte.
 */
export async function createInvitation(
  raw: unknown,
  ctx: InvitationContext,
): Promise<Result<{ url: string; emailSent: boolean }>> {
  const parsed = CreateInvitationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
  }
  const token = generateInvitationToken();
  const res = await repo.insertInvitation({
    dossierId: parsed.data.dossierId,
    role: parsed.data.role,
    email: parsed.data.email,
    tokenHash: hashInvitationToken(token),
  });
  if (res.error) return fromRepo(res.error, 'createInvitation');

  const siteUrl = ctx.siteUrl.replace(/\/+$/, '');
  const url = `${siteUrl}${localizedPath(`/invitation/${token}`, ctx.locale)}`;
  let emailSent = false;
  if (parsed.data.email) {
    const sent = await sendEmail(
      dossierInviteEmail({
        to: parsed.data.email,
        inviterName: ctx.inviterName,
        personName: ctx.personName,
        url,
        locale: ctx.locale === 'fr' ? 'fr' : 'en',
      }),
    );
    emailSent = sent.ok;
  }
  return { ok: true, data: { url, emailSent } };
}

/** Révoque une invitation du dossier ; « not_found » si elle n'existe pas ou vient d'un autre dossier. */
export async function revokeInvitation(dossierId: string, id: string): Promise<Result<null>> {
  const uuid = z.string().uuid();
  if (!uuid.safeParse(dossierId).success || !uuid.safeParse(id).success) {
    return { ok: false, error: 'validation' };
  }
  const res = await repo.deleteInvitation(dossierId, id);
  if (res.error) return fromRepo(res.error, 'revokeInvitation');
  return { ok: true, data: null };
}

export async function acceptInvitation(token: string): Promise<Result<{ dossierId: string }>> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, error: 'invitation_invalid' };
  const res = await repo.acceptInvitationByToken(token);
  if (res.error) return fromRepo(res.error, 'acceptInvitation');
  return { ok: true, data: { dossierId: res.data } };
}
