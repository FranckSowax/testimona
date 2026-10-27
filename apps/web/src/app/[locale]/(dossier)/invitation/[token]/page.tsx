import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AcceptInvitationForm } from '@/modules/dossier/ui/AcceptInvitationForm';

// WHY: le jeton est dans l'URL ; on évite l'indexation et la fuite via l'en-tête Referer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dossier');

  // WHY: l'acceptation passe par un bouton, jamais au chargement de la page : un
  // aperçu de lien (WhatsApp, e-mail) ferait sinon consommer l'invitation.
  return (
    <div className="px-4 py-12 sm:px-6">
      <div className="bg-secondary text-secondary-foreground mx-auto max-w-lg space-y-4 rounded-3xl p-8">
        <h1 className="font-display text-2xl font-bold">{t('invitation.title')}</h1>
        <p className="text-white/80">{t('invitation.lead')}</p>
        <AcceptInvitationForm token={token} />
      </div>
    </div>
  );
}
