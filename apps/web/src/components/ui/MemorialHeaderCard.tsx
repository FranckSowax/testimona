import Image from 'next/image';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Avatar } from './Avatar';
import { AnimatedName } from '@/components/motion/AnimatedName';

interface MemorialHeaderCardProps {
  fullName: string;
  yearLine?: string;
  nickname?: string | null;
  bio?: string | null;
  birthLine?: string;
  deathLine?: string;
  birthCity?: string;
  birthCountry?: string;
  deathCity?: string;
  deathCountry?: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  adminBadge?: ReactNode;
  adminAction?: ReactNode;
  sideActions?: ReactNode;
  bioActions?: ReactNode;
  className?: string;
}

/**
 * V2 MemorialHeaderCard — bandeau photo de fond + avatar bordure rose 4px débordant
 * + nom + dates + relation admin + side action panel (5 icônes verticales rose semi-transparent).
 */
export async function MemorialHeaderCard({
  fullName,
  yearLine,
  nickname,
  bio,
  birthLine,
  deathLine,
  birthCity,
  birthCountry,
  deathCity,
  deathCountry,
  coverUrl,
  avatarUrl,
  adminBadge,
  adminAction,
  sideActions,
  bioActions,
  className,
}: MemorialHeaderCardProps) {
  const t = await getTranslations('memorial.headerCard');
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
        <div className="relative aspect-[4/3] w-full bg-secondary sm:aspect-[16/6]">
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

        <div className="absolute -bottom-10 left-4 sm:-bottom-12 sm:left-10">
          <Avatar
            src={avatarUrl}
            name={fullName}
            size="lg"
            border="rose"
            className="ring-4 ring-white sm:!h-20 sm:!w-20"
          />
        </div>
      </header>

      <div className="px-4 pb-6 pt-14 sm:px-10 sm:pt-16">
        <h1 className="font-display text-xl font-bold leading-tight text-foreground sm:text-3xl">
          <AnimatedName text={fullName} />
          {yearLine && <span className="font-normal text-muted-foreground">, {yearLine}</span>}
        </h1>
        {nickname && (
          <p className="mt-1 text-base italic text-muted-foreground">« {nickname} »</p>
        )}

        {(adminBadge || adminAction) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
            {adminBadge && <span className="italic text-muted-foreground">{adminBadge}</span>}
            {adminAction && <span className="ml-auto">{adminAction}</span>}
          </div>
        )}

        {(birthLine || deathLine || bio) && (
          <div className="mt-4 space-y-2 text-sm leading-relaxed text-foreground">
            {birthLine && (
              <p>
                <strong className="font-display font-bold">{t('dateOfBirth')}</strong> {birthLine}
                {birthCity || birthCountry ? (
                  <>
                    {' '}
                    <strong className="font-display font-bold">{t('inLocation')}</strong>{' '}
                    {[birthCity, birthCountry].filter(Boolean).join(', ')}
                  </>
                ) : null}
              </p>
            )}
            {deathLine && (
              <p>
                <strong className="font-display font-bold">{t('dateOfDeath')}</strong> {deathLine}
                {deathCity || deathCountry ? (
                  <>
                    {' '}
                    <strong className="font-display font-bold">{t('inLocation')}</strong>{' '}
                    {[deathCity, deathCountry].filter(Boolean).join(', ')}
                  </>
                ) : null}
              </p>
            )}
            {bio && (
              <p className="mt-3 whitespace-pre-line text-foreground/80">{bio}</p>
            )}
          </div>
        )}

        {bioActions && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {bioActions}
          </div>
        )}
      </div>
    </article>
  );
}
