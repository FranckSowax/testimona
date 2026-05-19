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
 * (`falimg:<status_url>`) so the polling worker uses the exact regional
 * URL fal returned.
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
    };
    const statusUrl =
      json.status_url ??
      (json.request_id
        ? `${FAL_BASE}/${FLUX_I2I_PATH}/requests/${json.request_id}/status`
        : null);
    if (!statusUrl) return { error: 'fal img: missing status_url' };
    return { jobId: `falimg:${statusUrl}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Poll status. `jobId` is `falimg:<status_url>`. On COMPLETED we fetch
 * the result endpoint to recover the generated image URL.
 */
export async function falGetImageStatus(jobId: string): Promise<VisualJobStatus> {
  if (!jobId.startsWith('falimg:')) {
    return { status: 'failed', error: 'unsupported jobId' };
  }
  const statusUrl = jobId.slice('falimg:'.length);
  const resultUrl = statusUrl.replace(/\/status\b.*$/, '');
  try {
    const statusRes = await fetch(statusUrl, { headers: baseHeaders() });
    if (!statusRes.ok) {
      return { status: 'failed', error: `fal img status ${statusRes.status}` };
    }
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, { headers: baseHeaders() });
      if (!resultRes.ok) {
        return { status: 'failed', error: `fal img result ${resultRes.status}` };
      }
      const result = (await resultRes.json()) as {
        images?: { url?: string }[];
      };
      const url = result.images?.[0]?.url;
      if (!url) return { status: 'failed', error: 'fal img: no url' };
      return { status: 'ready', imageUrl: url };
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
