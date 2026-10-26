'use client';

import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollTrigger } from '@/lib/gsap/setup';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function MemorialTabs({ tabs }: { tabs: TabItem[] }) {
  const t = useTranslations('memorial');
  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '');
  const baseId = useId();

  // When a tab becomes visible, its panel gains layout — recalc any
  // ScrollTrigger inside it (parallax, scrub fills, reveals) which couldn't be
  // measured while hidden. Presentation-only.
  useEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [activeId]);

  // Deep-link support: when arriving with a #hash (e.g. "open memorial" from a
  // testimonial in the dashboard → #testimonial-<id>), the target may live in a
  // non-default, hidden tab where native hash scrolling never fires. Find the
  // panel that contains the anchor, activate its tab, then scroll to it.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const target = tabs.find((t) => {
      const panel = document.getElementById(`${baseId}-panel-${t.id}`);
      return panel?.querySelector(`#${CSS.escape(hash)}`) != null;
    });
    if (!target) return;
    setActiveId(target.id);
    // Let the panel unhide and lay out before scrolling.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.classList.add('ring-2', 'ring-primary/50', 'rounded-lg');
      });
    });
    return () => cancelAnimationFrame(raf);
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tabs.length === 0) return null;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next =
      e.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[next];
    if (!nextTab) return;
    setActiveId(nextTab.id);
    document.getElementById(`${baseId}-tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className="mt-8">
      {/* Outer scrolls; inner is w-max + mx-auto: centred when it fits, fully
          scrollable from the first tab when it overflows. A plain
          `justify-center` on the scroll container clipped BOTH ends of the
          overflowing tab row (Testimonials/Boutique unreachable in EN). */}
      <div
        role="tablist"
        aria-label={t('tabsAria')}
        className="border-border overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max min-w-full flex-nowrap items-center justify-center gap-2 sm:gap-6">
          {tabs.map((t, i) => {
            const selected = t.id === activeId;
            return (
              <button
                key={t.id}
                id={`${baseId}-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(t.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={[
                  'font-display -mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-base font-bold transition-colors focus:outline-none focus-visible:underline',
                  selected
                    ? 'border-primary text-primary'
                    : 'text-foreground hover:text-primary border-transparent',
                ].join(' ')}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={`${baseId}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== activeId}
          className="pt-6"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
