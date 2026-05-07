import Image from 'next/image';
import Link from 'next/link';

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
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] w-full bg-surface">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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
          <span className="absolute right-2 top-2 rounded-md bg-foreground/80 px-2 py-1 text-xs font-medium text-white">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="font-display text-lg font-semibold text-foreground">{fullName}</p>
        {nickname && <p className="text-sm italic text-muted-foreground">« {nickname} »</p>}
        <p className="mt-auto text-xs uppercase tracking-wide text-muted-foreground">
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
