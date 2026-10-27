import 'server-only';
import { Resend } from 'resend';
import { getSiteUrl } from '@/lib/site-url';

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Testimona <no-reply@testimona.com>';
const SITE_URL = getSiteUrl();

/**
 * Sends an email through Resend. Returns `{ ok: false, skipped: true }` when
 * RESEND_API_KEY is unset so callers can degrade gracefully in dev/preview.
 * Never throws — failures are logged and swallowed so a flaky email provider
 * cannot break the user-facing flow.
 */
export async function sendEmail(args: SendArgs): Promise<{
  ok: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const client = getClient();
  if (!client) return { ok: false, skipped: true };
  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });
    if (error) {
      // WHY: l'objet d'erreur complet peut contenir l'adresse du destinataire (PII).
      const { name, statusCode } = error as { name?: string; statusCode?: number | null };
      console.error('[resend] send error', { name, statusCode });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('[resend] unexpected error', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

// ---------------------------------------------------------------------------
// Templates — kept inline to avoid a dependency on a templating engine.
// All copy is bilingual: callers pass `locale: 'fr' | 'en'`.
// ---------------------------------------------------------------------------

interface BaseI18n {
  locale: 'fr' | 'en';
}

interface WelcomeArgs extends BaseI18n {
  to: string;
  displayName: string | null;
}

export function welcomeEmail({ to, displayName, locale }: WelcomeArgs) {
  const isFr = locale === 'fr';
  const name = displayName?.trim() || (isFr ? 'à toi' : 'there');
  const subject = isFr ? 'Bienvenue sur Testimona' : 'Welcome to Testimona';
  const greeting = isFr ? `Bonjour ${name},` : `Hi ${name},`;
  const lead = isFr
    ? "Merci d'avoir rejoint Testimona. Tu peux dès maintenant créer une page mémorielle pour honorer un proche, ou ajouter ton premier témoignage."
    : 'Thank you for joining Testimona. You can now create a memorial page to honor a loved one, or post your first testimonial.';
  const ctaText = isFr ? 'Ouvrir mon tableau de bord' : 'Open my dashboard';
  return {
    subject,
    html: layout({
      heading: subject,
      body: `
        <p>${greeting}</p>
        <p>${lead}</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${SITE_URL}/dashboard" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
    to,
  };
}

interface NewTestimonialArgs extends BaseI18n {
  to: string;
  ownerName: string | null;
  memorialName: string;
  memorialSlug: string;
  authorName: string;
  excerpt: string;
}

export function newTestimonialEmail({
  to,
  ownerName,
  memorialName,
  memorialSlug,
  authorName,
  excerpt,
  locale,
}: NewTestimonialArgs) {
  const isFr = locale === 'fr';
  const subject = isFr
    ? `Nouveau témoignage sur la page de ${memorialName}`
    : `New testimonial on ${memorialName}'s memorial`;
  const greeting = isFr ? `Bonjour ${ownerName ?? ''},`.trim() : `Hi ${ownerName ?? ''},`.trim();
  const intro = isFr
    ? `<strong>${escapeHtml(authorName)}</strong> vient de publier un témoignage sur la page mémorielle de <strong>${escapeHtml(memorialName)}</strong>.`
    : `<strong>${escapeHtml(authorName)}</strong> just posted a testimonial on <strong>${escapeHtml(memorialName)}</strong>'s memorial page.`;
  const ctaText = isFr ? 'Lire le témoignage' : 'Read the testimonial';
  return {
    subject,
    to,
    html: layout({
      heading: subject,
      body: `
        <p>${greeting}</p>
        <p>${intro}</p>
        <blockquote style="margin:24px 0;padding:16px 20px;border-left:4px solid #50aac3;background:#f0f2ff;font-style:italic;color:#2d3250">
          ${escapeHtml(excerpt.slice(0, 280))}${excerpt.length > 280 ? '…' : ''}
        </blockquote>
        <p style="text-align:center;margin:32px 0">
          <a href="${SITE_URL}/memorial/${memorialSlug}" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
  };
}

interface DonationReceiptArgs extends BaseI18n {
  to: string;
  memorialName: string;
  memorialSlug: string;
  amount: number;
  currency: string;
  message?: string | null;
}

export function donationReceiptEmail({
  to,
  memorialName,
  memorialSlug,
  amount,
  currency,
  message,
  locale,
}: DonationReceiptArgs) {
  const isFr = locale === 'fr';
  const formattedAmount = new Intl.NumberFormat(isFr ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency,
  }).format(amount / 100);
  const subject = isFr ? 'Reçu de votre don' : 'Donation receipt';
  const body = isFr
    ? `Merci pour votre don de <strong>${formattedAmount}</strong> en hommage à <strong>${escapeHtml(memorialName)}</strong>. Les proches en seront informés.`
    : `Thank you for your <strong>${formattedAmount}</strong> donation in memory of <strong>${escapeHtml(memorialName)}</strong>. The family has been notified.`;
  const ctaText = isFr ? 'Voir la page' : 'Open memorial';
  return {
    subject,
    to,
    html: layout({
      heading: subject,
      body: `
        <p>${body}</p>
        ${
          message
            ? `<blockquote style="margin:24px 0;padding:16px 20px;border-left:4px solid #db8186;background:#ffefef;font-style:italic;color:#2d3250">${escapeHtml(message)}</blockquote>`
            : ''
        }
        <p style="text-align:center;margin:32px 0">
          <a href="${SITE_URL}/memorial/${memorialSlug}" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
  };
}

interface DonationOwnerAlertArgs extends BaseI18n {
  to: string;
  memorialName: string;
  memorialSlug: string;
  amount: number;
  currency: string;
  donorName?: string | null;
  message?: string | null;
}

export function donationOwnerAlertEmail({
  to,
  memorialName,
  memorialSlug,
  amount,
  currency,
  donorName,
  message,
  locale,
}: DonationOwnerAlertArgs) {
  const isFr = locale === 'fr';
  const formattedAmount = new Intl.NumberFormat(isFr ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency,
  }).format(amount / 100);
  const subject = isFr
    ? `Nouveau don reçu pour ${memorialName}`
    : `New donation received for ${memorialName}`;
  const intro = isFr
    ? `${donorName ? `<strong>${escapeHtml(donorName)}</strong>` : 'Une personne'} vient de faire un don de <strong>${formattedAmount}</strong> en hommage à <strong>${escapeHtml(memorialName)}</strong>.`
    : `${donorName ? `<strong>${escapeHtml(donorName)}</strong>` : 'Someone'} just made a <strong>${formattedAmount}</strong> donation in memory of <strong>${escapeHtml(memorialName)}</strong>.`;
  const ctaText = isFr ? 'Voir la page' : 'Open memorial';
  return {
    subject,
    to,
    html: layout({
      heading: subject,
      body: `
        <p>${intro}</p>
        ${
          message
            ? `<blockquote style="margin:24px 0;padding:16px 20px;border-left:4px solid #db8186;background:#ffefef;font-style:italic;color:#2d3250">${escapeHtml(message)}</blockquote>`
            : ''
        }
        <p style="text-align:center;margin:32px 0">
          <a href="${SITE_URL}/memorial/${memorialSlug}" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
  };
}

interface CoOwnerInviteArgs extends BaseI18n {
  to: string;
  inviterName: string | null;
  memorialName: string;
  memorialSlug: string;
}

export function coOwnerInviteEmail({
  to,
  inviterName,
  memorialName,
  memorialSlug,
  locale,
}: CoOwnerInviteArgs) {
  const isFr = locale === 'fr';
  const subject = isFr
    ? `Invitation à co-administrer la page de ${memorialName}`
    : `Invitation to co-manage ${memorialName}'s memorial`;
  const intro = isFr
    ? `${inviterName ? `<strong>${escapeHtml(inviterName)}</strong>` : 'Un proche'} vous invite à devenir co-administrateur de la page mémorielle de <strong>${escapeHtml(memorialName)}</strong>.`
    : `${inviterName ? `<strong>${escapeHtml(inviterName)}</strong>` : 'A relative'} invites you to co-manage <strong>${escapeHtml(memorialName)}</strong>'s memorial page.`;
  const explain = isFr
    ? "Connectez-vous (ou créez un compte avec cette adresse), puis acceptez ou refusez l'invitation depuis « Invitations »."
    : 'Sign in (or create an account with this email), then accept or decline from "Invitations".';
  const ctaText = isFr ? 'Voir mes invitations' : 'View my invitations';
  return {
    subject,
    to,
    html: layout({
      heading: subject,
      body: `
        <p>${intro}</p>
        <p>${explain}</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${SITE_URL}/dashboard/admin-requests" style="${button()}">${ctaText}</a>
        </p>
        <p style="font-size:13px;color:#788199">${
          isFr ? 'Page concernée' : 'Memorial'
        } : <a href="${SITE_URL}/memorial/${memorialSlug}" style="color:#50aac3">${escapeHtml(memorialName)}</a></p>
      `,
      locale,
    }),
  };
}

interface DossierInviteArgs {
  to: string;
  inviterName: string | null;
  personName: string;
  url: string;
  locale: 'fr' | 'en';
}

/** Invitation à rejoindre un dossier familial (lien à usage unique, 7 jours). */
export function dossierInviteEmail({
  to,
  inviterName,
  personName,
  url,
  locale,
}: DossierInviteArgs) {
  const isFr = locale === 'fr';
  const who = inviterName
    ? `<strong>${escapeHtml(inviterName)}</strong>`
    : isFr
      ? 'Un proche'
      : 'A relative';
  const subject = isFr
    ? `Invitation à rejoindre le dossier de ${personName}`
    : `Invitation to join ${personName}'s family space`;
  const intro = isFr
    ? `${who} vous invite à préparer avec la famille l'hommage à <strong>${escapeHtml(personName)}</strong>.`
    : `${who} invites you to prepare <strong>${escapeHtml(personName)}</strong>'s tribute with the family.`;
  const explain = isFr
    ? 'Ce lien est personnel et valable 7 jours. Connectez-vous ou créez un compte pour rejoindre le dossier.'
    : 'This link is personal and valid for 7 days. Sign in or create an account to join.';
  const ctaText = isFr ? 'Rejoindre le dossier' : 'Join the family space';
  return {
    to,
    subject,
    html: layout({
      heading: subject,
      body: `
        <p>${intro}</p>
        <p>${explain}</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${escapeHtml(url)}" style="${button()}">${ctaText}</a>
        </p>
      `,
      locale,
    }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function button() {
  return [
    'display:inline-block',
    'padding:12px 24px',
    'border-radius:6px',
    'background:#50aac3',
    'color:#ffffff',
    'font-family:Montserrat,Helvetica,sans-serif',
    'font-weight:700',
    'font-size:14px',
    'text-decoration:none',
  ].join(';');
}

function layout({
  heading,
  body,
  locale,
}: {
  heading: string;
  body: string;
  locale: 'fr' | 'en';
}): string {
  const footer =
    locale === 'fr'
      ? `Vous recevez cet email parce que vous utilisez Testimona. <a href="${SITE_URL}" style="color:#50aac3">Visitez le site</a>.`
      : `You are receiving this email because you use Testimona. <a href="${SITE_URL}" style="color:#50aac3">Visit the site</a>.`;
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <body style="margin:0;padding:0;background:#fafafa;font-family:Montserrat,Helvetica,Arial,sans-serif;color:#2d3250">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #efefef;border-radius:12px">
                <tr>
                  <td style="padding:32px 32px 16px">
                    <p style="margin:0;font-family:Montserrat;font-size:24px;font-weight:700;color:#2d3250">Testimona</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;line-height:1.6;color:#2d3250">
                    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#2d3250">${escapeHtml(heading)}</h1>
                    ${body}
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 32px 24px;font-size:12px;color:#788199;border-top:1px solid #efefef">
                    ${footer}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
