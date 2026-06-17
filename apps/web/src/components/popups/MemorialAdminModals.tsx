'use client';

import { useState } from 'react';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard, PopupHeader } from './PopupCard';

export interface MemorialFormValues {
  firstname: string;
  lastname: string;
  birthYear?: string;
  birthMonth?: string;
  birthDay?: string;
  birthCountry?: string;
  birthCity?: string;
  deathYear: string;
  deathMonth?: string;
  deathDay?: string;
  deathCountry: string;
  deathCity?: string;
  relationship: string;
  bio?: string;
  musicUrl?: string;
}

interface MemorialFormPopupProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initial?: Partial<MemorialFormValues>;
  onSubmit: (values: MemorialFormValues) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "Memorial page — Edit info" (PDF p21) and "Create a new" (PDF p23).
 */
export function MemorialFormPopup({
  open,
  onClose,
  mode,
  initial = {},
  onSubmit,
  submitting = false,
}: MemorialFormPopupProps) {
  const [v, setV] = useState<MemorialFormValues>({
    firstname: initial.firstname ?? '',
    lastname: initial.lastname ?? '',
    birthYear: initial.birthYear ?? '',
    birthMonth: initial.birthMonth ?? '',
    birthDay: initial.birthDay ?? '',
    birthCountry: initial.birthCountry ?? '',
    birthCity: initial.birthCity ?? '',
    deathYear: initial.deathYear ?? '',
    deathMonth: initial.deathMonth ?? '',
    deathDay: initial.deathDay ?? '',
    deathCountry: initial.deathCountry ?? '',
    deathCity: initial.deathCity ?? '',
    relationship: initial.relationship ?? '',
    bio: initial.bio ?? '',
    musicUrl: initial.musicUrl ?? '',
  });
  const set = <K extends keyof MemorialFormValues>(k: K, val: MemorialFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // Surface the reason instead of silently swallowing the click — otherwise
    // the popup just "stays open" with no feedback (recette PDF p8).
    if (!v.firstname || !v.lastname || !v.deathYear || !v.deathCountry) {
      setLocalError('Renseigne au minimum le prénom, le nom, l’année et le pays de décès.');
      return;
    }
    setLocalError(null);
    await onSubmit(v);
  }

  return (
    <PopupCard
      open={open}
      onClose={onClose}
      ariaLabel={mode === 'create' ? 'Create a memorial' : 'Edit memorial info'}
      width="xl"
    >
      <div className="space-y-5">
        <PopupHeader
          scriptTitle="The memorial page"
          subtitle={mode === 'create' ? 'Create a new' : 'Edit info'}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Firstname*"
              value={v.firstname}
              onChange={(val) => set('firstname', val)}
              required
            />
            <Input
              label="Lastname*"
              value={v.lastname}
              onChange={(val) => set('lastname', val)}
              required
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="block font-display text-sm font-medium text-muted-foreground">
              Date of birth (Year required for memorial creation)
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="YYYY"
                value={v.birthYear}
                onChange={(e) => set('birthYear', e.target.value)}
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
              <input
                placeholder="MM"
                value={v.birthMonth}
                onChange={(e) => set('birthMonth', e.target.value)}
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
              <input
                placeholder="DD"
                value={v.birthDay}
                onChange={(e) => set('birthDay', e.target.value)}
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={mode === 'create' ? 'Country of birth*' : 'Country of birth'}
              value={v.birthCountry ?? ''}
              onChange={(val) => set('birthCountry', val)}
            />
            <Input
              label="Birth city"
              value={v.birthCity ?? ''}
              onChange={(val) => set('birthCity', val)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="block font-display text-sm font-medium text-muted-foreground">
              Date of death*
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="YYYY*"
                value={v.deathYear}
                onChange={(e) => set('deathYear', e.target.value)}
                required
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
              <input
                placeholder="MM"
                value={v.deathMonth}
                onChange={(e) => set('deathMonth', e.target.value)}
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
              <input
                placeholder="DD"
                value={v.deathDay}
                onChange={(e) => set('deathDay', e.target.value)}
                className="rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
              />
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Country of death*"
              value={v.deathCountry}
              onChange={(val) => set('deathCountry', val)}
              required
            />
            <Input
              label="Death city"
              value={v.deathCity ?? ''}
              onChange={(val) => set('deathCity', val)}
            />
          </div>

          <Input
            label="Relationship with the deceased*"
            value={v.relationship}
            onChange={(val) => set('relationship', val)}
            required
          />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Bio (max 280 characters)
            </span>
            <textarea
              value={v.bio ?? ''}
              onChange={(e) => set('bio', e.target.value.slice(0, 280))}
              maxLength={280}
              rows={3}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
            <span className="mt-1 block text-right text-xs italic text-muted-foreground tabular">
              {(v.bio ?? '').length}/280
            </span>
          </label>

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Ambient music (URL — optional)
            </span>
            <input
              type="url"
              value={v.musicUrl ?? ''}
              onChange={(e) => set('musicUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=… or https://…/song.mp3"
              maxLength={500}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-base font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)] sm:text-[15px]"
            />
            <span className="mt-1 block text-xs italic text-muted-foreground">
              Plays in loop during the photo slideshow. YouTube link or direct
              audio URL (mp3 / m4a / wav).
            </span>
          </label>

          {localError && (
            <p role="alert" className="text-center text-sm text-destructive">
              {localError}
            </p>
          )}

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
              {mode === 'create' ? 'Create memorial' : 'Save'}
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

interface MemorialAdminRequestProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { relationship: string; note: string }) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "Memorial page — Request to become an ADMIN" (PDF p23).
 */
export function MemorialAdminRequestPopup({
  open,
  onClose,
  onSubmit,
  submitting = false,
}: MemorialAdminRequestProps) {
  const [accepted, setAccepted] = useState(false);
  const [relationship, setRelationship] = useState('');
  const [note, setNote] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted || !relationship || submitting) return;
    await onSubmit({ relationship, note: note.trim() });
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Request admin" width="md">
      <div className="space-y-5">
        <PopupHeader scriptTitle="The memorial page" subtitle="Request" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              required
              className="mt-0.5 h-5 w-5 cursor-pointer rounded border-2 border-border accent-primary"
            />
            <span className="text-foreground">I want to be an administrator of this page</span>
          </label>

          <Input
            label="Your relationship with the deceased*"
            value={relationship}
            onChange={setRelationship}
            required
          />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Add a note
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={!accepted || !relationship}
            >
              Confirm
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}
function Input({ label, value, onChange, required }: InputProps) {
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
