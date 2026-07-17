import { getTranslations } from 'next-intl/server';
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
  isOwner = false,
}: {
  memorialId: string;
  slug: string;
  isOwner?: boolean;
}) {
  const [user, meta, t] = await Promise.all([
    getCurrentUser(),
    getMemorialMeta(memorialId),
    getTranslations('memorial.donateSection'),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const shareUrl = `${siteUrl}/memorial/${slug}#donate`;
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
        {t('heading')}
      </h2>

      {/* PDF p29 — bouton de don placé en haut du carré fundraising goal. */}
      <div className="flex justify-center">
        <DonateModalShell
          memorialId={memorialId}
          slug={slug}
          memorialName={meta.name}
          memorialCoverUrl={meta.coverUrl}
          donorAvatarUrl={donorAvatarUrl}
          donorName={donorName}
        />
      </div>

      <DonationGoal
        memorialId={memorialId}
        slug={slug}
        isOwner={isOwner}
        shareUrl={shareUrl}
      />

      <DonorsList memorialId={memorialId} />
    </section>
  );
}
