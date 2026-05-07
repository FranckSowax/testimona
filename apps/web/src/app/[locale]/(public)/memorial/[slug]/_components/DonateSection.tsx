import { getCurrentUser } from '@/lib/supabase/server';
import { DonateForm } from './DonateForm';
import { DonationGoal } from './DonationGoal';
import { DonorsList } from './DonorsList';

export async function DonateSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const user = await getCurrentUser();

  return (
    <section aria-labelledby="donate-heading" className="space-y-6">
      <h2 id="donate-heading" className="sr-only">
        Faire un don en hommage
      </h2>

      <DonationGoal memorialId={memorialId} />

      <DonateForm memorialId={memorialId} slug={slug} defaultEmail={user?.email ?? undefined} />

      <DonorsList memorialId={memorialId} />
    </section>
  );
}
