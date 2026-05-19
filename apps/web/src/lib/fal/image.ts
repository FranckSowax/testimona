import 'server-only';

/**
 * fal.ai image-to-image client — used by the memorial shop to derive a
 * sublimated portrait from a source photo of the deceased. Routes
 * through fal's queue API the same way the Seedance video client does
 * (Authorization: Key …, status_url returned from submit, SDK-style
 * User-Agent to pass the edge filter).
 */

const FAL_BASE = 'https://queue.fal.run';
// FLUX Pro 1.1 Ultra image-to-image: strong identity preservation +
// painterly stylisation. Replace endpoint if you want a different model.
const FLUX_I2I_PATH = 'fal-ai/flux-pro/v1.1-ultra/image-to-image';

/**
 * Single canonical prompt for memorial visuals. Designed to "sublime"
 * the subject — solemn, dignified, painterly, identity-preserving.
 */
export const MEMORIAL_VISUAL_PROMPT =
  'A noble, dignified memorial portrait of the person in the reference ' +
  'image. Soft, ethereal light reminiscent of dawn or candlelight. ' +
  'Sober, beautiful, respectful composition. Subtle painterly finish ' +
  '(watercolor / oil paint). Identity and facial features preserved ' +
  'exactly. Background: warm gradient with soft glow, evoking peace, ' +
  'remembrance, and quiet love. Centered portrait, head and shoulders, ' +
  'no logos, no text.';

export interface VisualSubmitParams {
  imageUrl: string;
  /** Optional timeline-derived caption appended to the base prompt. */
  extraPrompt?: string;
}

export interface VisualJobStatus {
  status: 'processing' | 'ready' | 'failed';
  imageUrl?: string;
  error?: string;
}

function readKey(): string | null {
  return (process.env.FAL_KEY ?? '').trim() || null;
}

export function isFalImageConfigured() {
  return readKey() !== null;
}

function baseHeaders(): Record<string, string> {
  const key = readKey();
  if (!key) throw new Error('FAL_KEY missing');
  return {
    Authorization: `Key ${key}`,
    'User-Agent': '@fal-ai/client/testimona-1.0',
    Accept: 'application/json',
  };
}

/**
 * Submit a Flux Pro image-to-image job. Returns the packaged status URL
 * AND response URL (when fal provides one) so the polling worker uses
 * the exact regional URLs fal returned. Format:
 *   `falimg:<status_url>` (legacy) OR
 *   `falimg2:<status_url>||<response_url>` (current)
 */
export async function falSubmitImage(
  params: VisualSubmitParams,
): Promise<{ jobId: string } | { error: string }> {
  const prompt = params.extraPrompt
    ? `${MEMORIAL_VISUAL_PROMPT} ${params.extraPrompt}`
    : MEMORIAL_VISUAL_PROMPT;
  try {
    const res = await fetch(`${FAL_BASE}/${FLUX_I2I_PATH}`, {
      method: 'POST',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.imageUrl,
        prompt,
        strength: 0.6,
        aspect_ratio: '3:4',
        num_images: 1,
        output_format: 'jpeg',
        safety_tolerance: '4',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `fal img submit ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    const statusUrl =
      json.status_url ??
      (json.request_id
        ? `${FAL_BASE}/${FLUX_I2I_PATH}/requests/${json.request_id}/status`
        : null);
    if (!statusUrl) return { error: 'fal img: missing status_url' };
    const responseUrl = json.response_url ?? '';
    return { jobId: `falimg2:${statusUrl}||${responseUrl}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Try to fetch the result from a few URL variants. fal's queue layer
 * uses `/response` for the result of the new endpoints, but historical
 * docs and SDK code use `/{request_id}` directly — different model
 * routes serve different conventions. We try the saved response_url
 * first, then fall back to `<status_url without /status>/response`,
 * then to `<status_url without /status>`.
 */
async function fetchResultFromCandidates(
  candidates: string[],
): Promise<
  | { ok: true; imageUrl: string }
  | { ok: false; lastStatus: number; error: string }
> {
  let lastStatus = 0;
  let lastErr = 'no candidates';
  for (const url of candidates) {
    if (!url) continue;
    const res = await fetch(url, { headers: baseHeaders() });
    if (!res.ok) {
      lastStatus = res.status;
      lastErr = `${res.status}`;
      continue;
    }
    const result = (await res.json().catch(() => null)) as
      | { images?: { url?: string }[]; image?: { url?: string } }
      | null;
    const imageUrl = result?.images?.[0]?.url ?? result?.image?.url;
    if (imageUrl) return { ok: true, imageUrl };
    lastErr = 'no url in body';
  }
  return { ok: false, lastStatus, error: lastErr };
}

/**
 * Poll status. `jobId` is `falimg2:<status_url>||<response_url>` (new) or
 * `falimg:<status_url>` (legacy). On COMPLETED we fetch the result.
 */
export async function falGetImageStatus(jobId: string): Promise<VisualJobStatus> {
  let statusUrl = '';
  let savedResponseUrl = '';

  if (jobId.startsWith('falimg2:')) {
    const payload = jobId.slice('falimg2:'.length);
    const [s, r] = payload.split('||');
    statusUrl = s ?? '';
    savedResponseUrl = r ?? '';
  } else if (jobId.startsWith('falimg:')) {
    statusUrl = jobId.slice('falimg:'.length);
  } else {
    return { status: 'failed', error: 'unsupported jobId' };
  }
  if (!statusUrl) return { status: 'failed', error: 'no statusUrl' };

  const stripped = statusUrl.replace(/\/status\b.*$/, '');
  const candidates = [
    savedResponseUrl,
    `${stripped}/response`,
    stripped,
  ];

  try {
    const statusRes = await fetch(statusUrl, { headers: baseHeaders() });
    if (!statusRes.ok) {
      return { status: 'failed', error: `fal img status ${statusRes.status}` };
    }
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') {
      const r = await fetchResultFromCandidates(candidates);
      if (!r.ok) return { status: 'failed', error: `fal img result ${r.error}` };
      return { status: 'ready', imageUrl: r.imageUrl };
    }
    if (status.status === 'IN_QUEUE' || status.status === 'IN_PROGRESS') {
      return { status: 'processing' };
    }
    return { status: 'failed', error: status.status ?? 'unknown' };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
