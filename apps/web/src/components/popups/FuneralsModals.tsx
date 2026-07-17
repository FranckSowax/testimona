'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { parseLocation, mapsEmbedSrc } from '@/lib/geo/maps';
import { PopupCard, PopupHeader } from './PopupCard';

export interface FuneralEventValues {
  title: string;
  date: string;
  startsAt: string;
  endsAt: string;
  url?: string;
  note?: string;
  /** Display name of the venue, e.g. "Église Saint-Michel". */
  location?: string;
  /**
   * Geocodable street address used to embed a Google Maps preview on
   * the public page. e.g. "Boulevard Triomphal, Libreville, Gabon".
   */
  address?: string;
}

const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

interface FuneralsEditPopupProps {
  open: boolean;
  onClose: () => void;
  initial?: string;
  onSubmit: (info: string) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * V2 popup "Funerals — Edit info" (PDF p42).
 */
export function FuneralsEditPopup({
  open,
  onClose,
  initial = '',
  onSubmit,
  submitting = false,
}: FuneralsEditPopupProps) {
  const [info, setInfo] = useState(initial);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await onSubmit(info.trim());
  }

  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Edit funeral info" width="lg">
      <div className="space-y-5">
        <PopupHeader scriptTitle="Funerals" subtitle="Edit info" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Funeral information
            </span>
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={5}
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
            >
              Save
            </ButtonOutlined>
          </div>
        </form>
      </div>
    </PopupCard>
  );
}

interface FuneralEventCreatePopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: FuneralEventValues) => Promise<void> | void;
  submitting?: boolean;
  /** When provided, the popup acts as an edit form pre-filled with these values. */
  initial?: Partial<FuneralEventValues>;
  mode?: 'create' | 'edit';
}

/**
 * V2 popup "Funerals — Create a new / Edit" (PDF p43-44, p39 edit).
 */
export function FuneralEventCreatePopup({
  open,
  onClose,
  onSubmit,
  submitting = false,
  initial,
  mode = 'create',
}: FuneralEventCreatePopupProps) {
  const t = useTranslations('popups.funeralEvent');
  const [v, setV] = useState<FuneralEventValues>({
    title: initial?.title ?? '',
    date: initial?.date ?? '',
    startsAt: initial?.startsAt ?? '14:00',
    endsAt: initial?.endsAt ?? '15:00',
    url: initial?.url ?? '',
    note: initial?.note ?? '',
    location: initial?.location ?? '',
    address: initial?.address ?? '',
  });
  const set = <K extends keyof FuneralEventValues>(k: K, val: FuneralEventValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !v.title.trim() || !v.date) return;
    await onSubmit(v);
  }

  return (
    <PopupCard
      open={open}
      onClose={onClose}
      ariaLabel={mode === 'edit' ? 'Edit funeral event' : 'Create funeral event'}
      width="lg"
    >
      <div className="space-y-5">
        <PopupHeader scriptTitle="Funerals" subtitle={mode === 'edit' ? 'Edit event' : 'Create a new'} />

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Event title*" value={v.title} onChange={(val) => set('title', val)} required />
          <Field
            label="Date* (YYYY-MM-DD)"
            value={v.date}
            onChange={(val) => set('date', val)}
            required
            type="date"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Starts*"
              value={v.startsAt}
              onChange={(val) => set('startsAt', val)}
              options={TIME_OPTIONS}
            />
            <Select
              label="Ends"
              value={v.endsAt}
              onChange={(val) => set('endsAt', val)}
              options={TIME_OPTIONS}
            />
          </div>

          <Field label="URL" value={v.url ?? ''} onChange={(val) => set('url', val)} type="url" />

          <label className="block">
            <span className="block font-display text-sm font-medium text-muted-foreground">
              Note
            </span>
            <textarea
              value={v.note ?? ''}
              onChange={(e) => set('note', e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
            />
          </label>

          <Field
            label={t('locationName')}
            value={v.location ?? ''}
            onChange={(val) => set('location', val)}
          />
          <Field
            label={t('address')}
            value={v.address ?? ''}
            onChange={(val) => set('address', val)}
          />
          {(() => {
            const raw = v.address?.trim() ?? '';
            if (!raw) return null;
            const loc = parseLocation(raw);
            const embed = mapsEmbedSrc(raw);
            const isUrl = /^https?:\/\//i.test(raw);
            // We only truly "recognise" a location we can pin exactly:
            // coordinates, or a Google Maps link. A free-typed address is NOT
            // geocoded, so we must not claim it's validated — just show an
            // indicative preview.
            const recognised = loc.valid && (loc.kind === 'coords' || isUrl);
            return (
              <>
                <p
                  className={[
                    'text-xs',
                    recognised ? 'text-emerald-600' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {recognised
                    ? loc.kind === 'coords'
                      ? t('previewCoords')
                      : t('previewMaps')
                    : t('previewUnverified')}
                </p>
                {embed && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={embed}
                      title={t('mapPreviewTitle')}
                      className="h-48 w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )}
              </>
            );
          })()}

          <div className="flex justify-center gap-3 pt-2">
            <ButtonOutlined type="button" variant="thankyou-gray" size="md" onClick={onClose}>
              Cancel
            </ButtonOutlined>
            <ButtonOutlined
              type="submit"
              variant="popup-rose"
              size="md"
              loading={submitting}
              disabled={!v.title.trim() || !v.date}
            >
              {mode === 'edit' ? 'Save' : 'Submit'}
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
  type?: string;
}
function Field({ label, value, onChange, required, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="block font-display text-sm font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
      />
    </label>
  );
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}
function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="block">
      <span className="block font-display text-sm font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)] px-4 py-3 text-[15px] font-semibold text-foreground placeholder:font-medium placeholder:text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
