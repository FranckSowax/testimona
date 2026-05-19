'use client';

import { useEffect, useState } from 'react';

const KEY = 'testimona:favorites';

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((s): s is string => typeof s === 'string'));
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new Event('testimona:favorites'));
  } catch {
    /* quota / disabled */
  }
}

/**
 * Local-only favorite list for the current device. Slug-based — keeps the
 * hook server-render-safe (returns false until hydration, then reads from
 * localStorage and listens for cross-tab + same-tab updates).
 */
export function useMemorialFavorite(slug: string) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIsFavorite(readSet().has(slug));
    setHydrated(true);
    const onUpdate = () => setIsFavorite(readSet().has(slug));
    window.addEventListener('storage', onUpdate);
    window.addEventListener('testimona:favorites', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('testimona:favorites', onUpdate);
    };
  }, [slug]);

  function toggle() {
    const next = readSet();
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    writeSet(next);
    setIsFavorite(next.has(slug));
  }

  return { isFavorite, toggle, hydrated };
}
