import Image from 'next/image';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

interface MemorialHeaderCardProps {
  fullName: string;
  yearLine?: string;
  nickname?: string | null;
  bio?: string | null;
  birthLine?: string;
  deathLine?: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  adminBadge?: ReactNode;
  sideActions?: ReactNode;
  bioActions?: ReactNode;
  className?: string;
}

/**
 * V2 MemorialHeaderCard — bandeau photo de fond + avatar bordure rose 4px débordant
 * + nom + dates + relation admin + side action panel (5 icônes verticales rose semi-transparent).
 */
export function MemorialHeaderCard({
  fullName,
  yearLine,
  nickname,
  bio,
  birthLine,
  deathLine,
  coverUrl,
  avatarUrl,
  adminBadge,
  sideActions,
  bioActions,
  className,
}: MemorialHeaderCardProps) {
  return (
    <article
      className={[
        'overflow-hidden rounded-lg border border-border bg-white shadow-[var(--shadow-card)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="relative">
        <div className="relative aspect-[16/6] w-full bg-secondary">
          {coverUrl ? (
            <Image src={coverUrl} alt="" fill sizes="100vw" priority className="object-cover" />
          ) : null}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(45,50,80,0.05) 0%, rgba(45,50,80,0.6) 100%)',
            }}
          />
          {sideActions && (
            <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-2 rounded-full bg-accent/80 p-2 shadow-md">
              {sideActions}
            </div>
          )}
        </div>

        <div className="absolute -bottom-12 left-6 sm:left-10">
          <Avatar
            src={avatarUrl}
            name={fullName}
            size="xl"
            border="rose"
            className="ring-4 ring-white"
          />
        </div>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-6 pt-16 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {fullName}
              {yearLine && <span className="font-normal text-muted-foreground">, {yearLine}</span>}
            </h1>
            {nickname && (
              <p className="text-base italic text-muted-foreground">« {nickname} »</p>
            )}
          </div>
          {adminBadge && <div className="text-xs italic text-muted-foreground">{adminBadge}</div>}
        </div>

        {(birthLine || deathLine || bio) && (
          <div className="rounded-md border-l-4 border-primary bg-surface p-4 text-sm leading-relaxed text-foreground">
            {birthLine && (
              <p>
                <strong className="font-display">Date of birth:</strong> {birthLine}
              </p>
            )}
            {deathLine && (
              <p>
                <strong className="font-display">Date of death:</strong> {deathLine}
              </p>
            )}
            {bio && <p className="mt-2 whitespace-pre-line">{bio}</p>}
            {bioActions && <div className="mt-3 flex justify-end">{bioActions}</div>}
          </div>
        )}
      </div>
    </article>
  );
}
