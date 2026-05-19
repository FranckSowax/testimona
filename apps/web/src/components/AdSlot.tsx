import Image from 'next/image';
import { getActiveAdForSlot, type AdSlot as AdSlotKey } from '@/lib/admin/ads';

interface Props {
  slot: AdSlotKey;
  /** Tailwind classes for the outer wrapper. */
  className?: string;
  /** Optional placeholder rendered when no active ad exists for this slot. */
  fallback?: React.ReactNode;
}

/**
 * Renders the active ad for a given slot, or the optional fallback / nothing.
 * Server component — fetches via service-role helper. Safe to drop in any
 * page since it short-circuits to null when AdSpace is empty.
 */
export async function AdSlot({ slot, className, fallback = null }: Props) {
  let ad: Awaited<ReturnType<typeof getActiveAdForSlot>> = null;
  try {
    ad = await getActiveAdForSlot(slot);
  } catch {
    return <>{fallback}</>;
  }
  if (!ad) return <>{fallback}</>;

  if (ad.type === 'html' && ad.html) {
    return (
      <aside
        aria-label="Advertisement"
        className={['relative', className ?? ''].filter(Boolean).join(' ')}
        // Admin-curated HTML; only landed by an authenticated admin, so we
        // trust the source. Strip scripts at the admin form layer if you
        // want to harden this further.
        dangerouslySetInnerHTML={{ __html: ad.html }}
      />
    );
  }

  if (ad.type === 'image' && ad.imageUrl) {
    const inner = (
      <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-md">
        <Image
          src={ad.imageUrl}
          alt={ad.name}
          fill
          sizes="(max-width: 1024px) 100vw, 300px"
          className="object-cover"
        />
      </span>
    );
    return (
      <aside
        aria-label="Advertisement"
        className={['relative', className ?? ''].filter(Boolean).join(' ')}
      >
        {ad.targetUrl ? (
          <a
            href={ad.targetUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block"
          >
            {inner}
          </a>
        ) : (
          inner
        )}
        <span className="mt-1 block font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Ad
        </span>
      </aside>
    );
  }

  return <>{fallback}</>;
}
