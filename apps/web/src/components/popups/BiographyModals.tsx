'use client';

import { useState } from 'react';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { ButtonText } from '@/components/ui/ButtonText';
import { PopupCard, PopupHeader } from './PopupCard';

export interface BiographyInfoValues {
  username?: string;
  homeCity?: string;
  placesLived?: string;
  relatives?: string;
  religion?: string;
  education?: string;
  work?: string;
  hobby?: string;
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
  const [v, setV] = useState<BiographyInfoValues>({
    username: initial.username ?? '',
    homeCity: initial.homeCity ?? '',
    placesLived: initial.placesLived ?? '',
    relatives: initial.relatives ?? '',
    religion: initial.religion ?? '',
    education: initial.education ?? '',
    work: initial.work ?? '',
    hobby: initial.hobby ?? '',
  });
  const set = <K extends keyof BiographyInfoValues>(k: K, val: BiographyInfoValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await onSubmit(v);
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Edit biography info" width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle="Biography" subtitle="Edit info" />

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Username / Nickname" value={v.username ?? ''} onChange={(val) => set('username', val)} />
          <Field label="Home city" value={v.homeCity ?? ''} onChange={(val) => set('homeCity', val)} />
          <Field label="Places lived" value={v.placesLived ?? ''} onChange={(val) => set('placesLived', val)} />
          <Field label="Relatives" value={v.relatives ?? ''} onChange={(val) => set('relatives', val)} />
          <Field label="Religion" value={v.religion ?? ''} onChange={(val) => set('religion', val)} />
          <Field label="Education" value={v.education ?? ''} onChange={(val) => set('education', val)} />
          <Field label="Work" value={v.work ?? ''} onChange={(val) => set('work', val)} />
          <Field label="Hobby" value={v.hobby ?? ''} onChange={(val) => set('hobby', val)} />

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
            >
              Save
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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photoCount, setPhotoCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !title.trim()) return;
    await onSubmit({ title: title.trim(), content: content.trim(), photoCount });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Create biography chapter" width="xl">
      <div className="space-y-5">
        <PopupHeader scriptTitle="Biography" subtitle="Create a new" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Chapter title" value={title} onChange={setTitle} required />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Story
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-surface p-3">
            <span className="text-xs italic text-muted-foreground">
              {photoCount}/2 photos attached
            </span>
            <ButtonText
              variant="action"
              type="button"
              onClick={() => setPhotoCount((c) => Math.min(2, c + 1))}
              disabled={photoCount >= 2}
            >
              + Add a photo / video (2 max.)
            </ButtonText>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={!title.trim()}
            >
              Submit
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
        className="mt-1 block w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}
