'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { ButtonText } from '@/components/ui/ButtonText';
import { PopupCard, PopupHeader } from './PopupCard';

const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';

/** Real file picker for chapter photos/videos (replaces the old fake counter). */
function ChapterMediaPicker({
  files,
  onChange,
  countLabel,
  addLabel,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  countLabel: string;
  addLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="border-border bg-surface rounded-md border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs italic">{countLabel}</span>
        <ButtonText
          variant="action"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={files.length >= MAX_CHAPTER_MEDIA}
        >
          {addLabel}
        </ButtonText>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          onChange([...files, ...picked].slice(0, MAX_CHAPTER_MEDIA));
          // Reset so re-picking the same file fires onChange again.
          e.target.value = '';
        }}
      />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="text-foreground flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate">
                {f.type.startsWith('video') ? '🎬' : '🖼️'} {f.name}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive shrink-0"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Max photos/videos per life chapter (PDF p36 — previously capped at 2). */
const MAX_CHAPTER_MEDIA = 10;

export interface BiographyInfoValues {
  username?: string;
  homeCity?: string;
  placesLived?: string;
  relatives?: string;
  religion?: string;
  education?: string;
  work?: string;
  hobby?: string;
  /** Social media accounts of the deceased — one URL per line (PDF p35). */
  socialLinks?: string;
}

export interface ChapterFormValues {
  title: string;
  content: string;
  files: File[];
}

interface BiographyEditPopupProps {
  open: boolean;
  onClose: () => void;
  initial?: Partial<BiographyInfoValues>;
  onSubmit: (values: BiographyInfoValues) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "Biography — Edit info" (PDF p38).
 */
export function BiographyEditPopup({
  open,
  onClose,
  initial = {},
  onSubmit,
  submitting = false,
}: BiographyEditPopupProps) {
  const t = useTranslations('popups.biographyEdit');
  const tCommon = useTranslations('popups.common');
  const [v, setV] = useState<BiographyInfoValues>({
    username: initial.username ?? '',
    homeCity: initial.homeCity ?? '',
    placesLived: initial.placesLived ?? '',
    relatives: initial.relatives ?? '',
    religion: initial.religion ?? '',
    education: initial.education ?? '',
    work: initial.work ?? '',
    hobby: initial.hobby ?? '',
    socialLinks: initial.socialLinks ?? '',
  });
  const set = <K extends keyof BiographyInfoValues>(k: K, val: BiographyInfoValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await onSubmit(v);
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel={t('ariaLabel')} width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field
            label={t('username')}
            value={v.username ?? ''}
            onChange={(val) => set('username', val)}
          />
          <Field
            label={t('homeCity')}
            value={v.homeCity ?? ''}
            onChange={(val) => set('homeCity', val)}
          />
          <Field
            label={t('placesLived')}
            value={v.placesLived ?? ''}
            onChange={(val) => set('placesLived', val)}
          />
          <Field
            label={t('relatives')}
            value={v.relatives ?? ''}
            onChange={(val) => set('relatives', val)}
          />
          <Field
            label={t('religion')}
            value={v.religion ?? ''}
            onChange={(val) => set('religion', val)}
          />
          <Field
            label={t('education')}
            value={v.education ?? ''}
            onChange={(val) => set('education', val)}
          />
          <Field label={t('work')} value={v.work ?? ''} onChange={(val) => set('work', val)} />
          <Field label={t('hobby')} value={v.hobby ?? ''} onChange={(val) => set('hobby', val)} />

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              {t('socialLinks')}
            </span>
            <textarea
              value={v.socialLinks ?? ''}
              onChange={(e) => set('socialLinks', e.target.value)}
              rows={3}
              placeholder={t('socialLinksPlaceholder')}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
          </label>

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              {tCommon('cancel')}
            </ButtonOutlined>
            <ButtonOutlined type="submit" variant="popup-rose" size="md" loading={submitting}>
              {tCommon('save')}
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

interface BiographyChapterCreateProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ChapterFormValues) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "Biography — Create a new" (PDF p39) — chapter creation.
 */
export function BiographyChapterCreatePopup({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: BiographyChapterCreateProps) {
  const t = useTranslations('popups.biographyChapter');
  const tCommon = useTranslations('popups.common');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !title.trim()) return;
    await onSubmit({ title: title.trim(), content: content.trim(), files });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel={t('ariaLabel')} width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('title')} value={title} onChange={setTitle} required />

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              {t('story')}
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
          </label>

          <ChapterMediaPicker
            files={files}
            onChange={setFiles}
            countLabel={t('photosCount', { count: files.length })}
            addLabel={t('addPhoto')}
          />

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              {tCommon('cancel')}
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={!title.trim()}
            >
              {tCommon('submit')}
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}
function Field({ label, value, onChange, required }: FieldProps) {
  return (
    <label className="block">
      <span className="font-display text-muted-foreground block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
      />
    </label>
  );
}
