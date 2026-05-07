'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';
import { uploadAvatarAction, removeAvatarAction } from './avatar-actions';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({ defaultUrl }: { defaultUrl: string | null }) {
  const t = useTranslations('dashboard.profile.avatar');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultUrl ?? null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setPreviewUrl(defaultUrl ?? null);
  }, [defaultUrl]);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error(t('errorMime'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('errorSize'));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadAvatarAction(null, fd);
      if (res.error) {
        toast.error(res.error);
        setPreviewUrl(defaultUrl ?? null);
      } else if (res.url) {
        toast.success(t('uploaded'));
        setPreviewUrl(res.url);
      }
      URL.revokeObjectURL(localUrl);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (res.error) toast.error(res.error);
      else {
        toast.success(t('removed'));
        setPreviewUrl(null);
      }
    });
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={previewUrl.startsWith('blob:')}
          />
        ) : (
          <Image
            src="/images/avatar-connected.svg"
            alt=""
            width={80}
            height={80}
            className="opacity-70"
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="font-display text-sm font-semibold text-foreground">{t('title')}</p>
        <p className="text-xs text-muted-foreground">{t('hint')}</p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={handlePick}
            disabled={pending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t('uploading') : t('upload')}
          </button>
          {previewUrl && !previewUrl.startsWith('blob:') && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={pending}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
            >
              {t('remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
