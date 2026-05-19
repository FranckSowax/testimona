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

/**
 * Uniform prompt used for every memorial animation. We don't pass the
 * caption text to Higgsfield — that gets overlayed in calligraphy on the
 * client. Higgsfield only ever sees this template, which produces a
 * dignified, restrained animation suitable for a remembrance context.
 */
export const TESTIMONA_VIDEO_PROMPT =
  'A dignified, restrained portrait animation of the person in the photo. ' +
  'They breathe gently, blink naturally, and offer a soft, warm, affectionate smile. ' +
  'Subtle, simple, emotive gestures only — a tilt of the head, a kind look, ' +
  'a tender expression. No background change. Cinematic lighting, gentle slow ' +
  'camera drift. Solemn, noble, peaceful atmosphere. Photorealistic, preserve ' +
  'the subject\'s identity and features faithfully.';

export interface SubmitJobParams {
  imageUrl: string;
  /** Currently ignored — we use TESTIMONA_VIDEO_PROMPT for every job. */
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

interface AttemptResult {
  scheme: string;
  status: number;
  body: string;
}

async function attempt(headerValue: string): Promise<AttemptResult> {
  const res = await fetch(`${HIGGSFIELD_BASE}/v1/image2video/dop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headerValue,
      'User-Agent': 'testimona-web/1.0',
    },
    body: JSON.stringify({}),
  });
  const body = await res.text().catch(() => '');
  return { scheme: headerValue.split(' ')[0] ?? '?', status: res.status, body: body.slice(0, 200) };
}

/**
 * Admin-only diagnostic — pings Higgsfield with multiple auth-header
 * variants to find which scheme our credentials are valid against.
 * A 400/422 means auth passed (validation rejected the empty body, which
 * is the goal). A 401 means the credentials are wrong for that scheme.
 */
export async function pingHiggsfield(): Promise<
  | { ok: true; mode: 'demo' | 'real'; verdict?: string }
  | {
      ok: false;
      status: number;
      body: string;
      idLen: number;
      secretLen: number;
      verdict: string;
      attempts: AttemptResult[];
    }
> {
  if (isDemoMode()) return { ok: true, mode: 'demo' };

  const creds = readCreds()!;
  const variants = [
    `Key ${creds.id}:${creds.secret}`,
    `Key ${creds.secret}:${creds.id}`, // swapped order
    `Bearer ${creds.id}:${creds.secret}`,
    `Bearer ${creds.secret}`,
    `Bearer ${creds.id}`,
    `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString('base64')}`,
  ];

  const attempts: AttemptResult[] = [];
  try {
    for (const v of variants) {
      const r = await attempt(v);
      attempts.push(r);
      if (r.status === 400 || r.status === 422 || (r.status >= 200 && r.status < 300)) {
        return {
          ok: true,
          mode: 'real',
          verdict: `auth OK avec scheme "${r.scheme}" — body validation reply ${r.status}: ${r.body}`,
        };
      }
    }
    // None of the variants passed auth.
    const primary = attempts[0]!;
    return {
      ok: false,
      status: primary.status,
      body: primary.body,
      idLen: creds.id.length,
      secretLen: creds.secret.length,
      verdict:
        primary.status === 401
          ? 'Tous les schémas d\'auth ont été rejetés. Cause la plus probable : les credentials ne sont pas activés pour l\'API REST (uniquement MCP), ou ton plan ne donne pas accès à l\'API. Va sur cloud.higgsfield.ai → API Keys et vérifie qu\'ils sont actifs.'
          : `Status inattendu (${primary.status}). Body: ${primary.body}`,
      attempts,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
      idLen: creds.id.length,
      secretLen: creds.secret.length,
      verdict: 'Erreur réseau ou DNS',
      attempts,
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

  // Endpoints we try in order — Higgsfield exposes different routes per
  // model family. We start with Seedance (cheaper, identity-preserving),
  // and only fall back to DOP if Seedance returns a routing 404.
  const attempts: { url: string; body: unknown }[] = [
    {
      url: `${HIGGSFIELD_BASE}/v1/image2video/seedance`,
      body: {
        params: {
          model: 'seedance_2_0',
          prompt: TESTIMONA_VIDEO_PROMPT,
          mode: 'std',
          resolution: '720p',
          duration: 5,
          input_images: [{ type: 'image_url', image_url: params.imageUrl }],
        },
      },
    },
    {
      url: `${HIGGSFIELD_BASE}/v1/image2video/dop`,
      body: {
        params: {
          model: 'dop-lite',
          prompt: TESTIMONA_VIDEO_PROMPT,
          input_images: [{ type: 'image_url', image_url: params.imageUrl }],
        },
      },
    },
  ];

  try {
    let lastRes: { status: number; text: string } | null = null;
    for (const a of attempts) {
      const res = await fetch(a.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader(),
          'User-Agent': 'testimona-web/1.0',
        },
        body: JSON.stringify(a.body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          request_id?: string;
          id?: string;
        };
        const jobId = json.request_id ?? json.id;
        if (!jobId) return { error: 'missing request_id in response' };
        return { jobId };
      }
      const text = await res.text().catch(() => '');
      lastRes = { status: res.status, text: text.slice(0, 200) };
      // Skip to next endpoint on routing-shaped failures only.
      if (res.status !== 404 && res.status !== 405) {
        break;
      }
    }
    if (lastRes && lastRes.status === 403 && lastRes.text.includes('credits')) {
      return {
        error:
          'Crédits compute insuffisants côté fournisseur. L\'admin doit recharger le solde Studia.',
      };
    }
    if (lastRes) {
      return { error: `submit ${lastRes.status}: ${lastRes.text}` };
    }
    return { error: 'no endpoint accepted the submission' };
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
