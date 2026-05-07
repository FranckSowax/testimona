'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/Toast';
import { uploadMemorialPhotoAction } from '../photo-actions';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

export function PhotoUploader({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const t = useTranslations('memorial.photoUploader');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);

  function submitFile(file: File) {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error(t('errorMime'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('errorSize'));
      return;
    }
    const fd = new FormData();
    fd.append('memorialId', memorialId);
    fd.append('slug', slug);
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadMemorialPhotoAction(null, fd);
      if (res.error) toast.error(res.error);
      else toast.success(t('uploaded'));
    });
  }

  function handlePick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) submitFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) submitFile(file);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={[
        'mb-6 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed bg-white px-6 py-8 text-center transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-border',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
      <p className="font-display text-sm font-semibold text-foreground">{t('title')}</p>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
      <button
        type="button"
        onClick={handlePick}
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('uploading') : t('upload')}
      </button>
    </div>
  );
}
