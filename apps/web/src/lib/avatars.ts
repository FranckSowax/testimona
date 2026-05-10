/**
 * Returns a deterministic Unsplash portrait URL based on a seed string (e.g. author name).
 * Use as a fallback for components that don't have an avatar URL stored in DB.
 *
 * Curated list of 20 Unsplash portrait photo IDs covering varied age/gender/ethnicity.
 * All photos are under Unsplash License (free for commercial use).
 *
 * Usage :
 *   <Avatar src={unsplashAvatarFor(authorName)} name={authorName} size="sm" />
 */
const PORTRAITS: readonly string[] = [
  '1438761681033-6461ffad8d80',
  '1494790108377-be9c29b29330',
  '1500648767791-00dcc994a43e',
  '1507003211169-0a1dd7228f2d',
  '1542909168-82c3e7fdca5c',
  '1544723795-3fb6469f5b39',
  '1545167622-3a6ac756afa4',
  '1554151228-14d9def656e4',
  '1557555187-23d685287bc3',
  '1560250097-0b93528c311a',
  '1573497019940-1c28c88b4f3e',
  '1580489944761-15a19d654956',
  '1582750433449-648ed127bb54',
  '1607746882042-944635dfe10e',
  '1611689342806-0863700ce1e4',
  '1633332755192-727a05c4013d',
  '1531123897727-8f129e1688ce',
  '1568602471122-7832951cc4c5',
  '1599566150163-29194dcaad36',
  '1592621385612-4d7129426394',
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function unsplashAvatarFor(seed: string | undefined | null, size = 200): string {
  const safe = (seed ?? 'anon').toLowerCase().trim() || 'anon';
  const id = PORTRAITS[hashSeed(safe) % PORTRAITS.length] ?? PORTRAITS[0]!;
  return `https://images.unsplash.com/photo-${id}?w=${size}&h=${size}&fit=crop&crop=faces`;
}
