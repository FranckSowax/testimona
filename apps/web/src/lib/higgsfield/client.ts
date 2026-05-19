import 'server-only';

/**
 * Higgsfield client — abstraction over the image-to-video generation API.
 *
 * Real integration hits https://platform.higgsfield.ai with the credentials
 * stored as HIGGSFIELD_API_KEY (= KEY_ID) and HIGGSFIELD_API_SECRET
 * (= KEY_SECRET). When either is missing we fall back to a deterministic
 * demo so the workflow can be exercised end-to-end without burning credit.
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

function isDemoMode() {
  return !process.env.HIGGSFIELD_API_KEY || !process.env.HIGGSFIELD_API_SECRET;
}

function authHeader() {
  return `Key ${process.env.HIGGSFIELD_API_KEY}:${process.env.HIGGSFIELD_API_SECRET}`;
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
