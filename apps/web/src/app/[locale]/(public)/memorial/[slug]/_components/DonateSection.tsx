import { getCurrentUser } from '@/lib/supabase/server';
import { DonateForm } from './DonateForm';

export async function DonateSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const user = await getCurrentUser();

  return (
    <section aria-labelledby="donate-heading" className="mt-12">
      <h2 id="donate-heading" className="text-2xl font-semibold">
        Faire un don en hommage
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Soutenez la mémoire de cette personne par un don.
      </p>
      <DonateForm memorialId={memorialId} slug={slug} defaultEmail={user?.email ?? undefined} />
    </section>
  );
}
