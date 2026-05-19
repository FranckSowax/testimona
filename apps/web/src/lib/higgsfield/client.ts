import 'server-only';

/**
 * Higgsfield client — abstraction over the image-to-video generation API.
 *
 * Real integration hits https://platform.higgsfield.ai using the
 * `Authorization: Key <KEY_ID>:<KEY_SECRET>` scheme. We read the
 * credentials from one of these env layouts (in order):
 *
 *   1) HIGGSFIELD_API_ID    + HIGGSFIELD_API_KEY     ← Higgsfield's docs
 *   2) HIGGSFIELD_API_KEY   + HIGGSFIELD_API_SECRET  ← legacy
 *
 * When both halves are missing we fall back to a deterministic demo so
 * the workflow can be exercised end-to-end without burning credit.
 */

const DEMO_CLIP_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

const HIGGSFIELD_BASE = 'https://platform.higgsfield.ai';

export interface SubmitJobParams {
  imageUrl: string;
  prompt: string;
  durationSec: number;
}

export interface JobStatus {
  status: 'processing' | 'ready' | 'failed';
  videoUrl?: string;
  error?: string;
}

function readCreds(): { id: string; secret: string } | null {
  // Preferred: their docs call them KEY_ID and KEY_SECRET; we accept
  // HIGGSFIELD_API_ID + HIGGSFIELD_API_KEY (which is what most users
  // see when they copy from the Higgsfield dashboard — id + key).
  // Trim defensively — Railway's UI sometimes adds trailing whitespace
  // or newlines when pasting, and Higgsfield's auth rejects those
  // silently with a 401 "Invalid credentials".
  const id = (
    process.env.HIGGSFIELD_API_ID ??
    process.env.HIGGSFIELD_KEY_ID ??
    ''
  ).trim();
  const secret = (
    process.env.HIGGSFIELD_API_SECRET ??
    process.env.HIGGSFIELD_KEY_SECRET ??
    process.env.HIGGSFIELD_API_KEY ??
    ''
  ).trim();
  if (!id || !secret) return null;
  return { id, secret };
}

function isDemoMode() {
  return readCreds() === null;
}

function authHeader() {
  const creds = readCreds();
  if (!creds) throw new Error('Higgsfield credentials missing');
  return `Key ${creds.id}:${creds.secret}`;
}

/**
 * Admin-only diagnostic — pings Higgsfield with the current credentials.
 * Strategy: POST an intentionally-empty body to the image2video endpoint.
 *  - 401 → credentials are wrong (auth gate rejected us)
 *  - 400/422 → credentials are GOOD (auth passed, body validation fired)
 *  - 405 → the path or method is wrong
 *  - 2xx → unexpected but credentials work
 */
export async function pingHiggsfield(): Promise<
  | { ok: true; mode: 'demo' | 'real'; verdict?: string }
  | { ok: false; status: number; body: string; idLen: number; secretLen: number; verdict: string }
> {
  if (isDemoMode()) return { ok: true, mode: 'demo' };

  const creds = readCreds()!;
  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/v1/image2video/dop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
        'User-Agent': 'testimona-web/1.0',
      },
      body: JSON.stringify({}),
    });
    const body = await res.text().catch(() => '');
    const idLen = creds.id.length;
    const secretLen = creds.secret.length;

    // 400/422 means auth gate passed, validation rejected the body.
    if (res.status === 400 || res.status === 422) {
      return {
        ok: true,
        mode: 'real',
        verdict: `auth OK — validation reply ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    // Some Higgsfield validators return 200 even with invalid params.
    if (res.ok) return { ok: true, mode: 'real', verdict: '2xx response' };

    return {
      ok: false,
      status: res.status,
      body: body.slice(0, 400),
      idLen,
      secretLen,
      verdict:
        res.status === 401
          ? 'Higgsfield rejette les credentials. Vérifie KEY_ID vs KEY_SECRET (peut-être inversés), espaces, et que ton compte a accès à l\'API REST (pas seulement MCP).'
          : `Status inattendu — endpoint peut-être déplacé. Body: ${body.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
      idLen: creds.id.length,
      secretLen: creds.secret.length,
      verdict: 'Erreur réseau ou DNS',
    };
  }
}

/**
 * Submit an image-to-video job using Higgsfield's DOP turbo model
 * (short, character-preserving animations of a single portrait).
 * Returns the request id we'll poll later.
 */
export async function submitImageToVideo(
  params: SubmitJobParams,
): Promise<{ jobId: string } | { error: string }> {
  if (isDemoMode()) {
    return { jobId: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }

  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/v1/image2video/dop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
        'User-Agent': 'testimona-web/1.0',
      },
      body: JSON.stringify({
        model: 'dop-turbo',
        prompt: params.prompt,
        input_images: [{ type: 'image_url', image_url: params.imageUrl }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `submit ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      request_id?: string;
      id?: string;
      status?: string;
    };
    const jobId = json.request_id ?? json.id;
    if (!jobId) return { error: 'missing request_id in response' };
    return { jobId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Poll the status of a job. Demo jobs become `ready` 30s after creation
 * (the timestamp is encoded in the demo id).
 */
export async function getJobStatus(jobId: string): Promise<JobStatus> {
  if (jobId.startsWith('demo_')) {
    const ts = Number(jobId.split('_')[1] ?? Date.now());
    const elapsed = Date.now() - ts;
    if (elapsed < 30_000) return { status: 'processing' };
    return { status: 'ready', videoUrl: DEMO_CLIP_URL };
  }

  try {
    const res = await fetch(`${HIGGSFIELD_BASE}/requests/${jobId}/status`, {
      headers: {
        Authorization: authHeader(),
        'User-Agent': 'testimona-web/1.0',
      },
    });
    if (!res.ok) {
      return { status: 'failed', error: `status ${res.status}` };
    }
    const json = (await res.json()) as {
      status?: string;
      video?: { url?: string };
      videos?: { url?: string }[];
      error?: string;
    };

    if (json.status === 'completed') {
      const url =
        json.video?.url ??
        json.videos?.[0]?.url ??
        null;
      if (!url) return { status: 'failed', error: 'no video url in response' };
      return { status: 'ready', videoUrl: url };
    }
    if (
      json.status === 'failed' ||
      json.status === 'nsfw' ||
      json.status === 'error'
    ) {
      return {
        status: 'failed',
        error: json.error ?? json.status ?? 'unknown',
      };
    }
    // 'queued' | 'in_progress' | anything else → still processing
    return { status: 'processing' };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
