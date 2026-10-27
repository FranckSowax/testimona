import type { DraftKind } from '../types';

// WHY: au-delà de ces tailles (texte encodé), navigateurs, messageries et WhatsApp tronquent ou
// refusent l'URL en silence ; mieux vaut ne pas proposer le lien que partager un texte coupé.
// Le seuil de 4000 pour `wa.me` est prudent : Meta ne documente aucune limite précise.
// `mailto:` est le plus fragile (Outlook et certains clients plafonnent vers 2 000 caractères).
const MAX_MAILTO_ENCODED = 1800;
const MAX_WHATSAPP_ENCODED = 4000;

/**
 * Lien d'ouverture directe d'un brouillon : `wa.me` pour WhatsApp, `mailto:` pour l'e-mail.
 * Renvoie null quand le texte encodé dépasse la limite sûre : l'appelant propose alors de copier.
 *
 * @example
 * shareHref('whatsapp', 'Bonjour & merci', null); // 'https://wa.me/?text=Bonjour%20%26%20merci'
 */
export function shareHref(kind: DraftKind, text: string, subject: string | null): string | null {
  const body = encodeURIComponent(text);
  if (kind === 'whatsapp') {
    return body.length > MAX_WHATSAPP_ENCODED ? null : `https://wa.me/?text=${body}`;
  }
  const subjectPart = encodeURIComponent(subject ?? '');
  return subjectPart.length + body.length > MAX_MAILTO_ENCODED
    ? null
    : `mailto:?subject=${subjectPart}&body=${body}`;
}
