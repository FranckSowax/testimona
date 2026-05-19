import 'server-only';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'memorial-clips';

function looksLikeHiggsfieldUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /higgsfield\.ai$/.test(u.hostname) || u.hostname.includes('higgsfield');
  } catch {
    return false;
  }
}

function higgsfieldAuthHeader(): string | undefined {
  const id =
    process.env.HIGGSFIELD_API_ID ?? process.env.HIGGSFIELD_KEY_ID;
  const secret =
    process.env.HIGGSFIELD_API_SECRET ??
    process.env.HIGGSFIELD_KEY_SECRET ??
    process.env.HIGGSFIELD_API_KEY;
  if (!id || !secret) return undefined;
  return `Key ${id}:${secret}`;
}

/**
 * Fetch a remote MP4 (Higgsfield CDN) and re-upload it to our Supabase
 * `memorial-clips` bucket so we control the lifetime and CORS. Returns the
 * public URL stored on MemorialClip.videoUrl.
 *
 * If the source fetch fails (CDN doesn't allow our IP, signed URL expired,
 * etc.), the caller can fall back to the original URL — the <video> tag
 * works fine with hot-linked URLs, we just lose the long-term guarantee.
 */
export async function mirrorClipToStorage(
  clipId: string,
  sourceUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'testimona-web/1.0',
    };
    // Higgsfield video URLs are sometimes protected — send the API key
    // when we recognise the host.
    if (looksLikeHiggsfieldUrl(sourceUrl)) {
      const auth = higgsfieldAuthHeader();
      if (auth) headers.Authorization = auth;
    }

    const res = await fetch(sourceUrl, { headers });
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
