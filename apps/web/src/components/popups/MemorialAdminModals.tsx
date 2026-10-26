'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { COUNTRIES, RELATIONSHIP_OPTIONS } from '@/lib/countries';
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
  /** Round miniature shown on the memorial header (client recette). */
  portraitFile?: File | null;
  /** Banner background of the memorial header. */
  coverFile?: File | null;
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
  const t = useTranslations('popups.memorialForm');
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
    portraitFile: null,
    coverFile: null,
  });
  const set = <K extends keyof MemorialFormValues>(k: K, val: MemorialFormValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function badDateTriplet(y?: string, m?: string, d?: string): boolean {
    const yy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    const currentYear = new Date().getFullYear();
    if (!(yy >= 1900 && yy <= currentYear)) return true;
    if (!(mm >= 1 && mm <= 12)) return true;
    if (!(dd >= 1 && dd <= 31)) return true;
    // Real calendar check (rejects Feb 31 & friends).
    const dt = new Date(yy, mm - 1, dd);
    return dt.getFullYear() !== yy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd;
  }

  /**
   * Inline error for one date group, shown directly under the fields (the
   * user filled the whole form before discovering a bottom-of-modal error —
   * recette feedback). Range errors show live as soon as the 3 parts are
   * typed; "incomplete" only complains after a submit attempt.
   */
  function dateGroupError(y?: string, m?: string, d?: string, required = false): string | null {
    const complete = !!(y && m && d);
    if (complete && badDateTriplet(y, m, d))
      return t('errorBadDate', { year: String(new Date().getFullYear()) });
    if (!complete && required && submitAttempted) return t('dateIncomplete');
    return null;
  }

  const birthDateError =
    mode === 'create' ? dateGroupError(v.birthYear, v.birthMonth, v.birthDay, true) : null;
  const deathDateError = dateGroupError(v.deathYear, v.deathMonth, v.deathDay, mode === 'create');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);

    // Surface the reason instead of silently swallowing the click — otherwise
    // the popup just "stays open" with no feedback (recette PDF p8).
    if (mode === 'create') {
      const datesBad =
        !v.birthYear ||
        !v.birthMonth ||
        !v.birthDay ||
        !v.deathYear ||
        !v.deathMonth ||
        !v.deathDay ||
        badDateTriplet(v.birthYear, v.birthMonth, v.birthDay) ||
        badDateTriplet(v.deathYear, v.deathMonth, v.deathDay);
      if (datesBad) {
        // The per-date inline messages (birthDateError/deathDateError) point
        // at the exact field; no bottom error needed for dates.
        setLocalError(null);
        return;
      }
      const missing =
        !v.firstname || !v.lastname || !v.birthCountry || !v.deathCountry || !v.relationship;
      if (missing) {
        setLocalError(t('errorRequired'));
        return;
      }
    } else if (!v.firstname || !v.lastname || !v.deathYear) {
      setLocalError(t('errorMinimum'));
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

          {/* Portrait + cover photos, straight from the modal (client recette). */}
          <div className="grid gap-3 sm:grid-cols-2">
            <PhotoPickField
              label="Profile photo (miniature)"
              hint={mode === 'edit' ? 'Leave empty to keep the current one' : undefined}
              file={v.portraitFile ?? null}
              onChange={(f) => set('portraitFile', f)}
              round
            />
            <PhotoPickField
              label="Cover photo"
              hint={mode === 'edit' ? 'Leave empty to keep the current one' : undefined}
              file={v.coverFile ?? null}
              onChange={(f) => set('coverFile', f)}
            />
          </div>

          <DateField
            label={mode === 'create' ? 'Date of birth*' : 'Date of birth'}
            year={v.birthYear ?? ''}
            month={v.birthMonth ?? ''}
            day={v.birthDay ?? ''}
            required={mode === 'create'}
            error={birthDateError}
            onChange={(y, m, d) =>
              setV((p) => ({ ...p, birthYear: y, birthMonth: m, birthDay: d }))
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <CountrySelect
              label={mode === 'create' ? 'Country of birth*' : 'Country of birth'}
              value={v.birthCountry ?? ''}
              onChange={(val) => set('birthCountry', val)}
              required={mode === 'create'}
            />
            <Input
              label="Birth city"
              value={v.birthCity ?? ''}
              onChange={(val) => set('birthCity', val)}
            />
          </div>

          <DateField
            label="Date of death*"
            year={v.deathYear}
            month={v.deathMonth ?? ''}
            day={v.deathDay ?? ''}
            required
            error={deathDateError}
            onChange={(y, m, d) =>
              setV((p) => ({ ...p, deathYear: y, deathMonth: m, deathDay: d }))
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <CountrySelect
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

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              Relationship with the deceased*
            </span>
            <select
              value={v.relationship}
              onChange={(e) => set('relationship', e.target.value)}
              required
              className="text-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            >
              <option value="">— Select —</option>
              {RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              Bio (max 280 characters)
            </span>
            <textarea
              value={v.bio ?? ''}
              onChange={(e) => set('bio', e.target.value.slice(0, 280))}
              maxLength={280}
              rows={3}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
            />
            <span className="text-muted-foreground tabular mt-1 block text-right text-xs italic">
              {(v.bio ?? '').length}/280
            </span>
          </label>

          <label className="block">
            <span className="font-display text-muted-foreground block text-sm font-medium">
              Ambient music (URL — optional)
            </span>
            <input
              type="url"
              value={v.musicUrl ?? ''}
              onChange={(e) => set('musicUrl', e.target.value)}
              placeholder="https://youtube.com/watch?v=… or https://…/song.mp3"
              maxLength={500}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-base font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none sm:text-[15px]"
            />
            <span className="text-muted-foreground mt-1 block text-xs italic">
              Plays in loop during the photo slideshow. YouTube link or direct audio URL (mp3 / m4a
              / wav).
            </span>
          </label>

          {localError && (
            <p role="alert" className="text-destructive text-center text-sm">
              {localError}
            </p>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined type="submit" variant="popup-rose" size="md" loading={submitting}>
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
              className="border-border accent-primary mt-0.5 h-5 w-5 cursor-pointer rounded border-2"
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
            <span className="font-display text-muted-foreground block text-sm font-medium">
              Add a note
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-foreground placeholder:text-muted-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 placeholder:font-medium focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
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

interface PhotoPickFieldProps {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  /** Preview as a circle (portrait) instead of a wide rectangle (cover). */
  round?: boolean;
}

/**
 * Image picker with live preview for the memorial portrait/cover
 * (client recette: both photos selectable straight from the modal).
 */
function PhotoPickField({ label, hint, file, onChange, round = false }: PhotoPickFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function pick(f: File | null) {
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
    onChange(f);
  }

  return (
    <label className="block">
      <span className="font-display text-muted-foreground block text-sm font-medium">{label}</span>
      <div className="border-border mt-1 flex items-center gap-3 rounded-md border border-dashed bg-[var(--color-bg-active-gray)] p-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className={[
              'shrink-0 object-cover',
              round ? 'h-12 w-12 rounded-full' : 'h-12 w-20 rounded-md',
            ].join(' ')}
          />
        ) : (
          <span
            aria-hidden="true"
            className={[
              'text-muted-foreground flex shrink-0 items-center justify-center bg-white',
              round ? 'h-12 w-12 rounded-full' : 'h-12 w-20 rounded-md',
            ].join(' ')}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              pick(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
            className="text-muted-foreground file:font-display file:text-primary hover:file:bg-primary/5 block w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold"
          />
          {file && (
            <button
              type="button"
              onClick={() => pick(null)}
              className="text-muted-foreground hover:text-destructive mt-1 text-xs"
            >
              ✕ {file.name.slice(0, 30)}
            </button>
          )}
          {hint && !file && <p className="text-muted-foreground mt-1 text-[11px] italic">{hint}</p>}
        </div>
      </div>
    </label>
  );
}

interface DateFieldProps {
  label: string;
  year: string;
  month: string;
  day: string;
  required: boolean;
  /** Inline error shown right under the field (not at the modal bottom). */
  error: string | null;
  onChange: (year: string, month: string, day: string) => void;
}

/**
 * Single native date field (same UX as the Funerals modal) mapped to the
 * year/month/day triplet the rest of the form still stores. The browser's own
 * calendar picker and locale-specific display are used — no format hint in the
 * label, so what the label says and what the field shows can't disagree.
 * Validation errors render directly under the field.
 */
function DateField({ label, year, month, day, required, error, onChange }: DateFieldProps) {
  const today = new Date().toISOString().slice(0, 10);
  const value =
    year && month && day
      ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : '';

  return (
    <label className="block">
      <span className="font-display text-muted-foreground block text-sm font-medium">{label}</span>
      <input
        type="date"
        value={value}
        min="1900-01-01"
        max={today}
        required={required}
        aria-invalid={!!error}
        onChange={(e) => {
          const [y, m, d] = e.target.value.split('-');
          if (y && m && d) onChange(y, m, d);
          else onChange('', '', '');
        }}
        className="text-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-destructive mt-1 text-xs">
          {error}
        </p>
      )}
    </label>
  );
}

function CountrySelect({ label, value, onChange, required }: InputProps) {
  return (
    <label className="block">
      <span className="font-display text-muted-foreground block text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="text-foreground focus:border-primary mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:shadow-[var(--shadow-glow-primary)] focus:outline-none"
      >
        <option value="">— Select —</option>
        {COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
