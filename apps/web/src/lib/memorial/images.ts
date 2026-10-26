import 'server-only';

import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — same cap as gallery photos

/**
 * Upload a memorial portrait/cover image to the memorial-photos bucket under
 * `<memorialId>/<kind>-<uuid>.<ext>` and return its public URL. Returns null
 * for missing/invalid files (wrong MIME, empty, oversized) — callers treat
 * that as "no change" rather than failing the whole form.
 *
 * Uses the service-role client: at creation time the Memorial row doesn't
 * exist yet, so the user-scoped storage policy (ownership via path prefix)
 * can't authorize the write. Callers MUST have checked authz first.
 */
export async function uploadMemorialImage(
  memorialId: string,
  file: unknown,
  kind: 'portrait' | 'cover',
): Promise<string | null> {
  if (!(file instanceof File)) return null;
  if (file.size === 0 || file.size > MAX_BYTES) return null;
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) return null;

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${memorialId}/${kind}-${randomUUID()}.${ext}`;

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb.storage
    .from('memorial-photos')
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: '3600' });
  if (error) return null;

  const { data } = adminDb.storage.from('memorial-photos').getPublicUrl(path);
  return data.publicUrl;
}
