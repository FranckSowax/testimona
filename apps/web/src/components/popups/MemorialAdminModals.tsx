'use client';

import { useRef, useState } from 'react';
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
  function dateGroupError(
    y?: string,
    m?: string,
    d?: string,
    required = false,
  ): string | null {
    const complete = !!(y && m && d);
    if (complete && badDateTriplet(y, m, d))
      return t('errorBadDate', { year: String(new Date().getFullYear()) });
    if (!complete && required && submitAttempted) return t('dateIncomplete');
    return null;
  }

  const birthDateError =
    mode === 'create'
      ? dateGroupError(v.birthYear, v.birthMonth, v.birthDay, true)
      : null;
  const deathDateError = dateGroupError(
    v.deathYear,
    v.deathMonth,
    v.deathDay,
    mode === 'create',
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitAttempted(true);

    // Surface the reason instead of silently swallowing the click — otherwise
    // the popup just "stays open" with no feedback (recette PDF p8).
    if (mode === 'create') {
      const datesBad =
        !v.birthYear || !v.birthMonth || !v.birthDay ||
        !v.deathYear || !v.deathMonth || !v.deathDay ||
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

          <DateTriplet
            legend={
              mode === 'create'
                ? 'Date of birth*'
                : 'Date of birth (Year required for memorial creation)'
            }
            year={v.birthYear ?? ''}
            month={v.birthMonth ?? ''}
            day={v.birthDay ?? ''}
            required={mode === 'create'}
            error={birthDateError}
            pickerLabel={t('pickDate')}
            onChange={(part, val) =>
              set(
                part === 'y' ? 'birthYear' : part === 'm' ? 'birthMonth' : 'birthDay',
                val,
              )
            }
            onPick={(y, m, d) =>
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

          <DateTriplet
            legend="Date of death*"
            year={v.deathYear}
            month={v.deathMonth ?? ''}
            day={v.deathDay ?? ''}
            required={mode === 'create'}
            yearAlwaysRequired
            error={deathDateError}
            pickerLabel={t('pickDate')}
            onChange={(part, val) =>
              set(
                part === 'y' ? 'deathYear' : part === 'm' ? 'deathMonth' : 'deathDay',
                val,
              )
            }
            onPick={(y, m, d) =>
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
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Relationship with the deceased*
            </span>
            <select
              value={v.relationship}
              onChange={(e) => set('relationship', e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
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

const DATE_FIELD_CLS =
  'w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]';

interface DateTripletProps {
  legend: string;
  year: string;
  month: string;
  day: string;
  required: boolean;
  /** Death year stays required even in edit mode. */
  yearAlwaysRequired?: boolean;
  /** Inline error shown right under the fields (not at the modal bottom). */
  error: string | null;
  pickerLabel: string;
  onChange: (part: 'y' | 'm' | 'd', value: string) => void;
  onPick: (year: string, month: string, day: string) => void;
}

/**
 * Year/Month/Day fields plus a native calendar picker button: the button opens
 * a hidden <input type="date"> (showPicker) and fills the three fields at once.
 * Validation errors render directly under this group so the user sees them at
 * the field, not after scrolling to the bottom of the modal.
 */
function DateTriplet({
  legend,
  year,
  month,
  day,
  required,
  yearAlwaysRequired = false,
  error,
  pickerLabel,
  onChange,
  onPick,
}: DateTripletProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const pickerValue =
    year && month && day
      ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : '';

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.click(); // older browsers without showPicker()
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="block font-display text-sm font-medium text-muted-foreground">
        {legend}
      </legend>
      <div className="flex items-start gap-2">
        <div className="grid flex-1 grid-cols-3 gap-2">
          <input
            placeholder="YYYY"
            inputMode="numeric"
            maxLength={4}
            required={required || yearAlwaysRequired}
            value={year}
            onChange={(e) => onChange('y', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!error}
            className={DATE_FIELD_CLS}
          />
          <input
            placeholder="MM"
            inputMode="numeric"
            maxLength={2}
            required={required}
            value={month}
            onChange={(e) => onChange('m', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!error}
            className={DATE_FIELD_CLS}
          />
          <input
            placeholder="DD"
            inputMode="numeric"
            maxLength={2}
            required={required}
            value={day}
            onChange={(e) => onChange('d', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!error}
            className={DATE_FIELD_CLS}
          />
        </div>

        {/* Calendar picker button — fills the 3 fields from a native date input */}
        <div className="relative">
          <button
            type="button"
            onClick={openPicker}
            aria-label={pickerLabel}
            title={pickerLabel}
            className="press-scale inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            min="1900-01-01"
            max={today}
            value={pickerValue}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-');
              if (y && m && d) onPick(y, m, d);
            }}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function CountrySelect({ label, value, onChange, required }: InputProps) {
  return (
    <label className="block">
      <span className="block font-display text-sm font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
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
