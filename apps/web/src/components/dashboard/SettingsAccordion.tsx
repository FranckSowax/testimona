'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  content: ReactNode;
}

interface SettingsAccordionProps {
  sections: SettingsSection[];
  ariaLabel?: string;
  className?: string;
}

/**
 * V2 Settings accordion — 4 collapsible sections (PDF p51-52).
 * Spec : Each section has +/− trigger right, opens/closes content.
 */
export function SettingsAccordion({
  sections,
  ariaLabel = 'Settings',
  className,
}: SettingsAccordionProps) {
  const [openSet, setOpenSet] = useState<Set<string>>(
    () => new Set(sections.filter((s) => s.defaultOpen).map((s) => s.id)),
  );
  const baseId = useId();

  function toggle(id: string) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={[
        'divide-border border-border divide-y rounded-lg border bg-white',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {sections.map((section) => {
        const isOpen = openSet.has(section.id);
        const headerId = `${baseId}-${section.id}-header`;
        const panelId = `${baseId}-${section.id}-panel`;
        return (
          <div key={section.id}>
            <h3 id={headerId} className="m-0">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(section.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg-hover-gray)] focus-visible:bg-[var(--color-bg-hover-gray)] focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="font-display text-foreground block text-base font-bold">
                    {section.title}
                  </span>
                  {section.description && (
                    <span className="text-muted-foreground mt-0.5 block text-xs italic">
                      {section.description}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="bg-surface text-foreground/60 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    {isOpen ? <path d="M5 12h14" /> : <path d="M5 12h14M12 5v14" />}
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!isOpen}
              className="px-5 pb-5"
            >
              {section.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
