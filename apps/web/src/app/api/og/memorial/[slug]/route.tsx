import { ImageResponse } from 'next/og';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MemorialMeta {
  firstname: string;
  lastname: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
  isPublic: boolean;
}

/**
 * Dynamic Open Graph image for /memorial/[slug].
 * Returns a 1200x630 PNG with the memorial name + year line.
 *
 * Read via the service-role client so OG generation is not blocked by RLS
 * (these images are only rendered for public memorials anyway — we still
 * check isPublic before serving).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const adminDb = getSupabaseAdminClient();
  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('firstname, lastname, nickname, birthDate, deathDate, isPublic')
    .eq('slug', slug)
    .maybeSingle<MemorialMeta>();

  if (!memorial || !memorial.isPublic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            background: '#2d3250',
            color: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          Testimona
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const fullName = `${memorial.firstname} ${memorial.lastname}`.trim();
  const birth = memorial.birthDate
    ? new Date(memorial.birthDate).getFullYear()
    : null;
  const death = memorial.deathDate
    ? new Date(memorial.deathDate).getFullYear()
    : null;
  const yearLine =
    birth && death ? `${birth} – ${death}` : death ? `${death}` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #2d3250 0%, #50aac3 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 28,
            opacity: 0.9,
            letterSpacing: 1.2,
          }}
        >
          <span style={{ fontWeight: 800 }}>Testimona</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ opacity: 0.85 }}>In memory</span>
        </div>

        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {memorial.nickname && (
            <div
              style={{
                fontSize: 36,
                fontStyle: 'italic',
                opacity: 0.85,
                color: '#f4a7ab',
              }}
            >
              « {memorial.nickname} »
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {fullName}
          </div>
          {yearLine && (
            <div
              style={{
                fontSize: 40,
                fontWeight: 500,
                opacity: 0.85,
              }}
            >
              {yearLine}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 22,
            opacity: 0.7,
          }}
        >
          <span>Share testimonials, photos and tributes.</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
