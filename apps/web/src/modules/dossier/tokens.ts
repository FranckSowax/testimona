import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/** Jeton d'invitation : 32 octets aléatoires en base64url (43 caractères). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Empreinte stockée en base ; identique à `sha256()` de `accept_dossier_invitation`. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
