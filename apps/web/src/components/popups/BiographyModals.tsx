'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { ButtonText } from '@/components/ui/ButtonText';
import { PopupCard, PopupHeader } from './PopupCard';

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
  photoCount: number;
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
          <Field label={t('username')} value={v.username ?? ''} onChange={(val) => set('username', val)} />
          <Field label={t('homeCity')} value={v.homeCity ?? ''} onChange={(val) => set('homeCity', val)} />
          <Field label={t('placesLived')} value={v.placesLived ?? ''} onChange={(val) => set('placesLived', val)} />
          <Field label={t('relatives')} value={v.relatives ?? ''} onChange={(val) => set('relatives', val)} />
          <Field label={t('religion')} value={v.religion ?? ''} onChange={(val) => set('religion', val)} />
          <Field label={t('education')} value={v.education ?? ''} onChange={(val) => set('education', val)} />
          <Field label={t('work')} value={v.work ?? ''} onChange={(val) => set('work', val)} />
          <Field label={t('hobby')} value={v.hobby ?? ''} onChange={(val) => set('hobby', val)} />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              {t('socialLinks')}
            </span>
            <textarea
              value={v.socialLinks ?? ''}
              onChange={(e) => set('socialLinks', e.target.value)}
              rows={3}
              placeholder={t('socialLinksPlaceholder')}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              {tCommon('cancel')}
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
            >
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
  const [photoCount, setPhotoCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !title.trim()) return;
    await onSubmit({ title: title.trim(), content: content.trim(), photoCount });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel={t('ariaLabel')} width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle={t('scriptTitle')} subtitle={t('subtitle')} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('title')} value={title} onChange={setTitle} required />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              {t('story')}
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-surface p-3">
            <span className="text-xs italic text-muted-foreground">
              {t('photosCount', { count: photoCount })}
            </span>
            <ButtonText
              variant="action"
              type="button"
              // PDF p36 — ne pas limiter à 2 photos/vidéos par chapitre de vie.
              onClick={() => setPhotoCount((c) => Math.min(MAX_CHAPTER_MEDIA, c + 1))}
              disabled={photoCount >= MAX_CHAPTER_MEDIA}
            >
              {t('addPhoto')}
            </ButtonText>
          </div>

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
      <span className="block font-display text-sm font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
      />
    </label>
  );
}
