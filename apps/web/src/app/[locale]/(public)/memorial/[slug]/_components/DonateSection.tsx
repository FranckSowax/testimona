import { getCurrentUser, getSupabaseServer } from '@/lib/supabase/server';
import { unsplashAvatarFor } from '@/lib/avatars';
import { DonateModalShell } from './DonateModalShell';
import { DonationGoal } from './DonationGoal';
import { DonorsList } from './DonorsList';

interface MemorialLite {
  firstname: string;
  lastname: string;
}

interface PhotoLite {
  url: string;
}

async function getMemorialMeta(
  memorialId: string,
): Promise<{ name: string; coverUrl: string | null }> {
  const supabase = await getSupabaseServer();
  const [{ data: m }, { data: p }] = await Promise.all([
    supabase
      .from('Memorial')
      .select('firstname, lastname')
      .eq('id', memorialId)
      .maybeSingle<MemorialLite>(),
    supabase
      .from('Photo')
      .select('url')
      .eq('memorialId', memorialId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle<PhotoLite>(),
  ]);
  const name = m ? `${m.firstname} ${m.lastname}`.trim() : 'Memorial';
  return { name, coverUrl: p?.url ?? null };
}

export async function DonateSection({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const [user, meta] = await Promise.all([getCurrentUser(), getMemorialMeta(memorialId)]);
  const userMeta = (user?.user_metadata ?? null) as
    | { avatar_url?: string | null; nickname?: string | null; full_name?: string | null }
    | null;
  const donorName =
    userMeta?.nickname || userMeta?.full_name || (user?.email ? user.email.split('@')[0] : '');
  const donorAvatarUrl =
    userMeta?.avatar_url ?? (donorName ? unsplashAvatarFor(donorName) : null);

  return (
    <section aria-labelledby="donate-heading" className="space-y-6">
      <h2 id="donate-heading" className="sr-only">
        Faire un don en hommage
      </h2>

      <DonationGoal memorialId={memorialId} />

      <div className="flex justify-center pt-2">
        <DonateModalShell
          memorialId={memorialId}
          slug={slug}
          memorialName={meta.name}
          memorialCoverUrl={meta.coverUrl}
          donorAvatarUrl={donorAvatarUrl}
          donorName={donorName}
        />
      </div>

      <DonorsList memorialId={memorialId} />
    </section>
  );
}
