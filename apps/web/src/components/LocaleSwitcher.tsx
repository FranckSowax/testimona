'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LABELS: Record<(typeof routing.locales)[number], string> = {
  fr: 'Français',
  en: 'English',
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof routing.locales)[number];
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="sr-only">Langue</span>
      <select
        value={locale}
        onChange={onChange}
        disabled={isPending}
        className="rounded border border-border bg-transparent px-2 py-1 text-foreground/80 hover:text-foreground disabled:opacity-50"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
