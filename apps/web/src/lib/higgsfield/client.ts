import 'server-only';

/**
 * Higgsfield client — abstraction over the image-to-video generation API.
 *
 * Real integration goes through the Higgsfield MCP at
 * https://mcp.higgsfield.ai/mcp, which expects HIGGSFIELD_API_KEY +
 * HIGGSFIELD_API_SECRET. When those env vars are missing we fall back to
 * a deterministic demo mode that pretends to generate clips so the rest
 * of the workflow (UI, polling, viewer) can be exercised end-to-end
 * without burning real credits.
 */

const DEMO_CLIP_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';

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

/**
 * Submit an image-to-video job. Returns the Higgsfield job id (or a stub
 * id prefixed with `demo_` in demo mode).
 */
export async function submitImageToVideo(
  params: SubmitJobParams,
): Promise<{ jobId: string } | { error: string }> {
  if (isDemoMode()) {
    return { jobId: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }

  try {
    const res = await fetch('https://mcp.higgsfield.ai/mcp/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
        'X-API-Secret': process.env.HIGGSFIELD_API_SECRET as string,
      },
      body: JSON.stringify({
        type: 'image_to_video',
        image_url: params.imageUrl,
        prompt: params.prompt,
        duration_seconds: params.durationSec,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: `Higgsfield ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as { id?: string; job_id?: string };
    const jobId = json.id ?? json.job_id;
    if (!jobId) return { error: 'Higgsfield response missing job id' };
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
    const res = await fetch(`https://mcp.higgsfield.ai/mcp/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
        'X-API-Secret': process.env.HIGGSFIELD_API_SECRET as string,
      },
    });
    if (!res.ok) {
      return { status: 'failed', error: `Status ${res.status}` };
    }
    const json = (await res.json()) as {
      status?: string;
      video_url?: string;
      error?: string;
    };
    if (json.status === 'completed' || json.status === 'done') {
      if (!json.video_url) return { status: 'failed', error: 'no video_url' };
      return { status: 'ready', videoUrl: json.video_url };
    }
    if (json.status === 'failed' || json.status === 'error') {
      return { status: 'failed', error: json.error ?? 'unknown' };
    }
    return { status: 'processing' };
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
