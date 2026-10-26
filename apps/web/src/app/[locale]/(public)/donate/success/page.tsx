import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Don confirmé',
  robots: { index: false, follow: false },
};

export default async function DonationSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; session_id?: string }>;
}) {
  const { slug } = await searchParams;
  const back = slug ? `/memorial/${slug}` : '/';

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Merci pour votre don</h1>
      <p className="text-muted-foreground mt-4">
        Votre paiement a été enregistré par Stripe. Vous recevrez un reçu par email.
      </p>
      <Link
        href={back}
        className="bg-primary text-primary-foreground mt-8 inline-block rounded-md px-4 py-2 hover:opacity-90"
      >
        Retour au mémorial
      </Link>
    </div>
  );
}
