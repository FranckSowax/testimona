/**
 * Shared types + constants for the AdSpace feature.
 *
 * No `import 'server-only'` here — this file is meant to be imported by
 * client components (forms) AND server-side helpers. Keep it free of
 * Supabase / Node-only imports.
 */

export type AdType = 'image' | 'html';

export const AD_SLOTS = [
  'home-sidebar',
  'home-footer',
  'memorial-aside',
  'dashboard-sidebar',
] as const;
export type AdSlot = (typeof AD_SLOTS)[number];

export interface AdRow {
  id: string;
  name: string;
  slot: string;
  type: AdType;
  imageUrl: string | null;
  targetUrl: string | null;
  html: string | null;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}
