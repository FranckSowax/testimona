'use client';

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  panel: ReactNode;
}

export function MemorialTabs({ tabs }: { tabs: TabItem[] }) {
  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? '');
  const baseId = useId();

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
      <div
        role="tablist"
        aria-label="Sections du mémorial"
        className="flex flex-wrap items-center justify-center gap-2 border-b border-border sm:gap-6"
      >
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
                'px-3 py-3 -mb-px border-b-2 font-display text-base font-bold transition-colors focus:outline-none focus-visible:underline',
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground hover:text-primary',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
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
