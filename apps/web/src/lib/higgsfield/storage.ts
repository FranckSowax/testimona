import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'memorial-clips';

/**
 * Fetch a remote MP4 (Higgsfield CDN) and re-upload it to our Supabase
 * `memorial-clips` bucket so we control the lifetime and CORS. Returns the
 * public URL stored on MemorialClip.videoUrl.
 */
export async function mirrorClipToStorage(
  clipId: string,
  sourceUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return { ok: false, error: `source fetch ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const supabase = getSupabaseAdminClient();
    const path = `${clipId}.mp4`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buf, {
        contentType: 'video/mp4',
        upsert: true,
        cacheControl: '31536000',
      });
    if (upErr) return { ok: false, error: upErr.message };
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
