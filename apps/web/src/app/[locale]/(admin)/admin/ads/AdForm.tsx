'use client';

import { useActionState, useState } from 'react';
import { AD_SLOTS, type AdRow } from '@/lib/admin/ads-shared';
import { createAdAction, updateAdAction, type AdActionState } from './actions';

interface Labels {
  name: string;
  slot: string;
  type: string;
  typeImage: string;
  typeHtml: string;
  imageUrl: string;
  imageUrlHint: string;
  targetUrl: string;
  targetUrlHint: string;
  html: string;
  htmlHint: string;
  startsAt: string;
  expiresAt: string;
  isActive: string;
  save: string;
  saving: string;
}

const SLOT_LABELS: Record<string, string> = {
  'home-sidebar': 'Accueil — Sidebar',
  'home-footer': 'Accueil — Pied de page',
  'memorial-aside': 'Mémorial — Aside',
  'dashboard-sidebar': 'Dashboard — Sidebar',
};

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function AdForm({ initial, labels }: { initial?: AdRow | null; labels: Labels }) {
  const isEdit = !!initial;
  const action = isEdit ? updateAdAction : createAdAction;
  const [state, formAction, isPending] = useActionState<AdActionState | null, FormData>(
    action,
    null,
  );
  const [type, setType] = useState<'image' | 'html'>(initial?.type ?? 'image');

  return (
    <form action={formAction} className="border-border space-y-5 rounded-lg border bg-white p-5">
      {isEdit && <input type="hidden" name="id" defaultValue={initial.id} />}

      <Field label={labels.name} error={state?.fieldErrors?.name}>
        <input
          name="name"
          required
          defaultValue={initial?.name ?? ''}
          maxLength={120}
          className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
        />
      </Field>

      <Field label={labels.slot} error={state?.fieldErrors?.slot}>
        <select
          name="slot"
          required
          defaultValue={initial?.slot ?? AD_SLOTS[0]}
          className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
        >
          {AD_SLOTS.map((s) => (
            <option key={s} value={s}>
              {SLOT_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </Field>

      <Field label={labels.type} error={state?.fieldErrors?.type}>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as 'image' | 'html')}
          className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
        >
          <option value="image">{labels.typeImage}</option>
          <option value="html">{labels.typeHtml}</option>
        </select>
      </Field>

      {type === 'image' ? (
        <>
          <Field
            label={labels.imageUrl}
            hint={labels.imageUrlHint}
            error={state?.fieldErrors?.imageUrl}
          >
            <input
              name="imageUrl"
              type="url"
              defaultValue={initial?.imageUrl ?? ''}
              placeholder="https://…/banner.jpg"
              className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
            />
          </Field>
          <Field label={labels.targetUrl} hint={labels.targetUrlHint}>
            <input
              name="targetUrl"
              type="url"
              defaultValue={initial?.targetUrl ?? ''}
              placeholder="https://partner.example.com/landing"
              className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
            />
          </Field>
        </>
      ) : (
        <Field label={labels.html} hint={labels.htmlHint} error={state?.fieldErrors?.html}>
          <textarea
            name="html"
            rows={8}
            defaultValue={initial?.html ?? ''}
            placeholder="<a href='…'><img src='…' /></a>"
            className="border-border text-foreground focus:border-primary w-full rounded-md border bg-white px-3 py-2.5 font-mono text-base focus:outline-none sm:text-sm"
          />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={labels.startsAt}>
          <input
            name="startsAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(initial?.startsAt ?? null)}
            className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
          />
        </Field>
        <Field label={labels.expiresAt}>
          <input
            name="expiresAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(initial?.expiresAt ?? null)}
            className="border-border text-foreground focus:border-primary h-11 w-full rounded-md border bg-white px-3 text-base focus:outline-none"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="border-border accent-primary h-5 w-5 rounded border-2"
        />
        <span className="font-display text-foreground font-medium">{labels.isActive}</span>
      </label>

      {state?.error && state.error !== 'Validation' && (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary font-display text-primary-foreground rounded-md px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? labels.saving : labels.save}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-display text-foreground block text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </label>
  );
}
