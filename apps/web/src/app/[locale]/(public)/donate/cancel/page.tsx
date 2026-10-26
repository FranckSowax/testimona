import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Don annulé',
  robots: { index: false, follow: false },
};

export default async function DonationCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const back = slug ? `/memorial/${slug}` : '/';

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Don non finalisé</h1>
      <p className="text-muted-foreground mt-4">
        Votre paiement n’a pas été effectué. Aucun montant n’a été prélevé.
      </p>
      <Link
        href={back}
        className="border-border hover:bg-muted mt-8 inline-block rounded-md border px-4 py-2"
      >
        Retour au mémorial
      </Link>
    </div>
  );
}
