import Image from 'next/image';
import { Link } from '@/i18n/navigation';

export interface MemorialCardProps {
  slug: string;
  fullName: string;
  nickname?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  coverUrl?: string | null;
  href?: string;
  badge?: string | null;
}

export function MemorialCard({
  slug,
  fullName,
  nickname,
  birthDate,
  deathDate,
  coverUrl,
  href,
  badge,
}: MemorialCardProps) {
  const target = href ?? `/memorial/${slug}`;

  return (
    <Link
      href={target}
      className="press-scale border-border focus-visible:ring-primary group flex flex-col overflow-hidden rounded-lg border bg-white shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 ease-[var(--motion-ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] focus-visible:outline-none focus-visible:ring-2"
    >
      <div className="bg-surface relative aspect-[4/3] w-full overflow-hidden">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[var(--motion-ease-out)] group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Image
              src="/images/dove.svg"
              alt=""
              width={96}
              height={96}
              className="h-16 w-16 opacity-40"
            />
          </div>
        )}
        {badge && (
          <span className="bg-foreground/80 absolute right-2 top-2 rounded-md px-2 py-1 text-xs font-medium text-white">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-display text-foreground text-lg font-semibold">{fullName}</p>
        {nickname && <p className="text-muted-foreground text-sm italic">« {nickname} »</p>}
        <p className="text-muted-foreground mt-auto text-xs uppercase tracking-wide">
          {formatDateRange(birthDate ?? null, deathDate ?? null)}
        </p>
      </div>
    </Link>
  );
}

function formatDateRange(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '?');
  if (!birth && !death) return '';
  return `${fmt(birth)} — ${fmt(death)}`;
}
