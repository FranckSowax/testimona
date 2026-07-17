import 'server-only';

/**
 * fal.ai client for Kling image-to-video. Used as a parallel provider to
 * Higgsfield — when FAL_KEY is set the rest of the stack routes generation
 * through here instead.
 *
 * Model: Kling 2.1 Master. We deliberately do NOT use Bytedance Seedance:
 * Seedance's content policy rejects "likenesses of real people"
 * (content_policy_violation), which is exactly Testimona's use case —
 * animating portraits of the deceased. Kling permits real-person portrait
 * animation.
 *
 * Auth: `Authorization: Key <FAL_KEY>` (NOT Bearer).
 * Queue API base: https://queue.fal.run/<model_path>
 */

const FAL_BASE = 'https://queue.fal.run';
const KLING_PATH = 'fal-ai/kling-video/v2.1/master/image-to-video';

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
 * Headers every fal request needs. Empirically, fal's edge layer was
 * returning 405 on status GETs when the request didn't look like it
 * came from their official SDK — adding a user-agent mimicking the JS
 * SDK gets through cleanly.
 */
function baseHeaders(): Record<string, string> {
  return {
    Authorization: authHeader(),
    'User-Agent': '@fal-ai/client/testimona-1.0',
    Accept: 'application/json',
  };
}

/**
 * Submit a Kling image-to-video job to fal.ai's queue.
 *
 * Returns the queue status_url packaged as the job id (prefixed `falurl:`).
 * Storing the URL directly side-steps fal's per-region queue routing:
 * when we POST a submit fal may bounce us to a regional cluster, and the
 * returned `status_url` already points at that cluster. Re-constructing
 * the URL from the model path can return a 405 if we accidentally hit
 * the wrong region.
 */
export async function falSubmitImageToVideo(
  params: FalSubmitParams,
): Promise<{ jobId: string } | { error: string }> {
  try {
    const res = await fetch(`${FAL_BASE}/${KLING_PATH}`, {
      method: 'POST',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.imageUrl,
        prompt: params.prompt,
        // Kling only accepts "5" or "10" seconds. Aspect ratio and resolution
        // are inferred from the input image (no such params on this model).
        duration: params.durationSec >= 10 ? '10' : '5',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `fal submit ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      request_id?: string;
      gateway_request_id?: string;
      status_url?: string;
      response_url?: string;
    };
    // Prefer the absolute URLs fal returns — they point at the right
    // regional cluster. Fall back to constructing with request_id only
    // if the response is missing them (older API versions).
    const statusUrl =
      json.status_url ??
      (json.request_id
        ? `${FAL_BASE}/${KLING_PATH}/requests/${json.request_id}/status`
        : null);
    if (!statusUrl) return { error: 'fal: missing status_url & request_id' };
    // Package the response_url too (new `falurl2:` format). fal serves the
    // result at `<status_url without /status>/response`, NOT at the bare
    // `.../requests/<id>` — fetching the latter returns 422. Mirrors the
    // working image client. Legacy `falurl:` jobs still poll (candidates
    // below cover them).
    const responseUrl = json.response_url ?? '';
    return { jobId: `falurl2:${statusUrl}||${responseUrl}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Poll the queue. `jobId` is expected to be the packaged status_url —
 * we strip the `falurl:` prefix and GET the URL directly. The response
 * URL is derived by removing the trailing /status segment.
 */
export async function falGetJobStatus(jobId: string): Promise<FalJobStatus> {
  // Support the new packaged form (`falurl2:<status_url>||<response_url>`),
  // the previous `falurl:<status_url>` form, and the legacy bare request_id
  // so clips submitted before each fix still poll.
  let statusUrl = '';
  let savedResponseUrl = '';
  if (jobId.startsWith('falurl2:')) {
    const [s, r] = jobId.slice('falurl2:'.length).split('||');
    statusUrl = s ?? '';
    savedResponseUrl = r ?? '';
  } else if (jobId.startsWith('falurl:')) {
    statusUrl = jobId.slice('falurl:'.length);
  } else {
    statusUrl = `${FAL_BASE}/${KLING_PATH}/requests/${jobId}/status`;
  }
  if (!statusUrl) return { status: 'failed', error: 'fal: no statusUrl' };

  // fal serves the result at `<status_url without /status>/response`. The bare
  // `.../requests/<id>` returns 422, which was the cause of "fal result 422".
  // Try the exact response_url first, then the `/response` convention, then
  // the bare URL as a last resort. Same strategy as the image client.
  const stripped = statusUrl.replace(/\/status\b.*$/, '');
  const resultCandidates = [savedResponseUrl, `${stripped}/response`, stripped];

  try {
    const statusRes = await fetch(statusUrl, {
      headers: baseHeaders(),
    });
    if (!statusRes.ok) {
      return { status: 'failed', error: `fal status ${statusRes.status}` };
    }
    const status = (await statusRes.json()) as { status?: string };

    if (status.status === 'COMPLETED') {
      let lastStatus = 0;
      let lastBody = '';
      for (const url of resultCandidates) {
        if (!url) continue;
        const resultRes = await fetch(url, { headers: baseHeaders() });
        if (!resultRes.ok) {
          lastStatus = resultRes.status;
          // Capture the body: on a COMPLETED job a 4xx here is fal reporting
          // *why the generation failed* (bad param, content policy, etc.), not
          // a wrong URL. Surfacing it is the only way to see the real cause.
          lastBody = (await resultRes.text().catch(() => '')).slice(0, 300);
          continue;
        }
        const result = (await resultRes.json().catch(() => null)) as
          | { video?: { url?: string }; videos?: { url?: string }[] }
          | null;
        const videoUrl = result?.video?.url ?? result?.videos?.[0]?.url;
        if (videoUrl) return { status: 'ready', videoUrl };
      }
      return {
        status: 'failed',
        error: lastStatus
          ? `fal result ${lastStatus}: ${lastBody || '(empty body)'}`
          : 'fal: no video url',
      };
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
    const res = await fetch(`${FAL_BASE}/${KLING_PATH}`, {
      method: 'POST',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
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
