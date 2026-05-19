import 'server-only';

/**
 * fal.ai client for Seedance 2.0 image-to-video. Used as a parallel
 * provider to Higgsfield — when FAL_KEY is set the rest of the stack
 * routes generation through here instead. Cheaper per second than
 * Higgsfield DOP, hosts Seedance 2.0 directly from Bytedance.
 *
 * Auth: `Authorization: Key <FAL_KEY>` (NOT Bearer).
 * Queue API base: https://queue.fal.run/<model_path>
 */

const FAL_BASE = 'https://queue.fal.run';
const SEEDANCE_PATH = 'bytedance/seedance-2.0/image-to-video';

export interface FalSubmitParams {
  imageUrl: string;
  prompt: string;
  durationSec: number;
}

export interface FalJobStatus {
  status: 'processing' | 'ready' | 'failed';
  videoUrl?: string;
  error?: string;
}

function readKey(): string | null {
  return (process.env.FAL_KEY ?? '').trim() || null;
}

export function isFalConfigured() {
  return readKey() !== null;
}

function authHeader() {
  const key = readKey();
  if (!key) throw new Error('FAL_KEY missing');
  return `Key ${key}`;
}

/**
 * Submit a Seedance 2.0 image-to-video job to fal.ai's queue.
 * Returns the queue request id for later polling.
 */
export async function falSubmitImageToVideo(
  params: FalSubmitParams,
): Promise<{ jobId: string } | { error: string }> {
  try {
    const res = await fetch(`${FAL_BASE}/${SEEDANCE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        image_url: params.imageUrl,
        prompt: params.prompt,
        resolution: '720p',
        duration: String(params.durationSec),
        aspect_ratio: 'auto',
        generate_audio: false,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `fal submit ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      request_id?: string;
      gateway_request_id?: string;
    };
    const jobId = json.request_id ?? json.gateway_request_id;
    if (!jobId) return { error: 'fal: missing request_id' };
    return { jobId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Poll the queue status. When COMPLETED we fetch the result endpoint to
 * recover the actual video URL.
 */
export async function falGetJobStatus(jobId: string): Promise<FalJobStatus> {
  try {
    const statusRes = await fetch(
      `${FAL_BASE}/${SEEDANCE_PATH}/requests/${jobId}/status`,
      {
        headers: { Authorization: authHeader() },
      },
    );
    if (!statusRes.ok) {
      return { status: 'failed', error: `fal status ${statusRes.status}` };
    }
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(
        `${FAL_BASE}/${SEEDANCE_PATH}/requests/${jobId}`,
        {
          headers: { Authorization: authHeader() },
        },
      );
      if (!resultRes.ok) {
        return { status: 'failed', error: `fal result ${resultRes.status}` };
      }
      const result = (await resultRes.json()) as {
        video?: { url?: string };
      };
      const url = result.video?.url;
      if (!url) return { status: 'failed', error: 'fal: no video url' };
      return { status: 'ready', videoUrl: url };
    }
    if (
      status.status === 'IN_QUEUE' ||
      status.status === 'IN_PROGRESS'
    ) {
      return { status: 'processing' };
    }
    // 'CANCELLED', 'FAILED', or unknown
    return { status: 'failed', error: status.status ?? 'unknown' };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Diagnostic ping — POST an intentionally-empty body. A 4xx body-validation
 * error means the auth gate accepted the key. A 401 means it didn't.
 */
export async function pingFal(): Promise<
  | { ok: true; verdict: string }
  | { ok: false; status: number; body: string; verdict: string }
> {
  try {
    const res = await fetch(`${FAL_BASE}/${SEEDANCE_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
      },
      body: JSON.stringify({}),
    });
    const body = await res.text().catch(() => '');
    if (res.status === 400 || res.status === 422) {
      return {
        ok: true,
        verdict: `auth OK (body validation ${res.status}: ${body.slice(0, 150)})`,
      };
    }
    if (res.ok) return { ok: true, verdict: '2xx response' };
    return {
      ok: false,
      status: res.status,
      body: body.slice(0, 400),
      verdict:
        res.status === 401
          ? 'fal refuse la clé — vérifie FAL_KEY (espaces, valeur, droits sur le modèle Seedance).'
          : `Status inattendu (${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
      verdict: 'Erreur réseau',
    };
  }
}
