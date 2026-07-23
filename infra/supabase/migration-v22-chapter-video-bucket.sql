-- ============================================================================
-- Testimona — migration-v22-chapter-video-bucket.sql
-- Biography chapter media (v20 feature) uploads photos AND videos into the
-- memorial-photos bucket, but the bucket only allowed image MIME types at
-- 10 MB — video uploads were rejected by Storage and silently skipped.
-- Extend the allowlist with the video types the app accepts and raise the
-- size limit to 60 MB (photo actions still cap images at 10 MB app-side).
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

update storage.buckets
set file_size_limit = 62914560, -- 60 MB
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id = 'memorial-photos';
