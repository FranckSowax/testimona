'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';

interface Suggestion {
  slug: string;
  label: string;
  nickname: string | null;
}

/**
 * Header search box with name autocomplete (PDF p7). Fetches suggestions from
 * /api/search/suggest once the user has typed ≥2 characters (debounced).
 * Submitting (Enter / search button) navigates to the full /search page.
 */
export function HeaderSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced fetch on ≥3 chars.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setItems(data.results ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted / network — ignore */
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(slug: string) {
    setOpen(false);
    setQ('');
    router.push(`/memorial/${slug}` as '/');
  }

  function submitSearch() {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}` as '/');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitSearch();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = items[active];
      if (chosen) go(chosen.slug);
      else submitSearch();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative ml-auto hidden max-w-md flex-1 sm:block sm:max-w-sm md:max-w-md"
    >
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className="flex w-full items-center gap-3 rounded-full border border-transparent bg-[var(--color-bg-active-gray)] px-5 transition-[background-color,border-color,box-shadow] duration-150 focus-within:border-primary focus-within:bg-white focus-within:shadow-[var(--shadow-glow-primary)]"
      >
        <label htmlFor="header-search" className="sr-only">
          {placeholder}
        </label>
        <input
          id="header-search"
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => items.length > 0 && setOpen(true)}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          className="h-11 min-w-0 flex-1 bg-transparent font-display text-base font-medium text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground sm:text-sm"
          autoComplete="off"
        />
        <button
          type="button"
          aria-label={placeholder}
          onClick={submitSearch}
          className="shrink-0 text-muted-foreground hover:text-primary"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[var(--z-modal)] mt-2 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-[var(--shadow-overlay)]"
        >
          {items.map((it, i) => (
            <li key={it.slug} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(it.slug)}
                className={[
                  'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left font-display text-sm transition-colors',
                  i === active ? 'bg-surface text-primary' : 'text-foreground hover:bg-surface',
                ].join(' ')}
              >
                <span className="font-semibold">{it.label}</span>
                {it.nickname && (
                  <span className="truncate text-xs italic text-muted-foreground">
                    « {it.nickname} »
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
