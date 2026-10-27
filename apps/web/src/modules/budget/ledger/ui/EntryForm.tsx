'use client';

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { saveEntryAction, type LedgerFormState } from '../actions';
import { ENTRY_METHODS, ledgerToday } from '../schema';
import { FIELD_MESSAGES, isLedgerSpecific } from './ledgerError';
import { useIdempotencyKey } from './useIdempotencyKey';

/** Membre proposé pour rattacher une cotisation reçue. */
export interface MemberOption {
  id: string;
  name: string | null;
}

/** Promesse ouverte proposée pour une cotisation reçue ; `amount` est le reste à verser. */
export interface PledgeOption {
  id: string;
  label: string;
  amount: number;
}

interface Props {
  dossierId: string;
  kind: 'pledge' | 'receipt' | 'expense';
  members?: readonly MemberOption[];
  pledges?: readonly PledgeOption[];
  amountLabel: (amount: number) => string;
}

const FIELD =
  'border-border bg-background text-foreground w-full rounded-xl border px-3 py-2 disabled:opacity-60';
const LABEL = 'text-foreground text-sm';

/**
 * Saisie d'une promesse, d'une cotisation reçue ou d'une dépense.
 *
 * @example
 * <EntryForm dossierId={id} kind="pledge" amountLabel={(n) => formatXaf(n, 'fr')} />
 */
export function EntryForm({ dossierId, kind, members = [], pledges = [], amountLabel }: Props) {
  const t = useTranslations('ledger');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    saveEntryAction,
    null,
  );
  const [key, renew] = useIdempotencyKey();
  const [today, setToday] = useState<string | undefined>(undefined);
  const [pledgeId, setPledgeId] = useState('');
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();

  // WHY: calculée au montage, comme la clé, pour éviter un écart serveur/navigateur à minuit.
  useEffect(() => setToday(ledgerToday()), []);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setPledgeId('');
      setSaved(true);
      renew();
    } else if (state?.fieldErrors) {
      // WHY: le focus va au premier champ à corriger, que le lecteur d'écran annonce.
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, renew]);

  // WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
  // même en erreur, et la personne perdrait sa saisie.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || key === '') return;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
  // WHY: effacé à la saisie suivante, pour que le prochain succès soit annoncé de nouveau.
  const clearSaved = () => setSaved(false);

  const pledge = pledges.find((p) => p.id === pledgeId);
  const onPledgeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPledgeId(e.target.value);
    const chosen = pledges.find((p) => p.id === e.target.value);
    const name = formRef.current?.elements.namedItem('partyName');
    if (chosen && name instanceof HTMLInputElement && name.value.trim() === '') {
      name.value = chosen.label;
    }
  };

  const showMethod = kind !== 'pledge';
  const showMember = kind === 'receipt';
  const showPledge = kind === 'receipt' && pledges.length > 0;
  const shown = [
    'partyName',
    'amount',
    'occurredOn',
    'note',
    ...(showMethod ? ['method'] : []),
    ...(showMember ? ['memberId'] : []),
    ...(showPledge ? ['pledgeId'] : []),
  ];

  const fieldError = (name: string): string | null => {
    const message = state?.fieldErrors?.[name];
    if (!message) return null;
    const textKey = FIELD_MESSAGES[message];
    return textKey ? t(textKey) : tErrors('validation');
  };
  const idOf = (name: string) => `${uid}-${name}`;
  const errorIdOf = (name: string) => `${uid}-${name}-error`;
  const memberHintId = `${uid}-memberId-hint`;
  const a11y = (name: string, hintId?: string) => {
    const error = fieldError(name);
    const describedBy = [hintId, error ? errorIdOf(name) : undefined].filter(Boolean).join(' ');
    return {
      id: idOf(name),
      name,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
    } as const;
  };
  const wrap = (name: string, label: string, control: ReactNode, hint?: ReactNode) => {
    const error = fieldError(name);
    return (
      <div className="space-y-1">
        <label htmlFor={idOf(name)} className={`block ${LABEL}`}>
          {label}
        </label>
        {control}
        {hint}
        {error && (
          <p id={errorIdOf(name)} role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    );
  };
  const input = (name: string, label: string, props: InputHTMLAttributes<HTMLInputElement>) =>
    wrap(name, label, <input className={FIELD} {...a11y(name)} {...props} />);

  // WHY: une erreur de champ caché (dossier, clé) n'a pas de place à côté d'un champ visible.
  const hasShownFieldError = Object.keys(state?.fieldErrors ?? {}).some((n) => shown.includes(n));
  const generalError =
    state?.error && !hasShownFieldError
      ? isLedgerSpecific(state.error)
        ? t(`errors.${state.error}`)
        : tErrors(state.error)
      : null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onInput={clearSaved}
      onChange={clearSaved}
      className="grid gap-3 sm:grid-cols-2"
      noValidate
    >
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {input('partyName', kind === 'expense' ? t('form.supplier') : t('form.party'), {
        required: true,
        maxLength: 120,
        autoComplete: 'off',
      })}
      {input('amount', t('form.amount'), {
        required: true,
        inputMode: 'numeric',
        autoComplete: 'off',
        placeholder: pledge ? String(pledge.amount) : undefined,
      })}
      {showMethod &&
        wrap(
          'method',
          t('form.method'),
          <select defaultValue="cash" className={FIELD} {...a11y('method')}>
            {ENTRY_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(`method.${m}`)}
              </option>
            ))}
          </select>,
        )}
      {showPledge &&
        wrap(
          'pledgeId',
          t('form.pledge'),
          <select
            value={pledgeId}
            onChange={onPledgeChange}
            className={FIELD}
            {...a11y('pledgeId')}
          >
            <option value="">{t('form.pledgeNone')}</option>
            {pledges.map((p) => (
              <option key={p.id} value={p.id}>
                {`${p.label} · ${amountLabel(p.amount)}`}
              </option>
            ))}
          </select>,
        )}
      {showMember &&
        wrap(
          'memberId',
          t('form.member'),
          // WHY: un champ désactivé n'est pas envoyé ; la base recopie le membre de la promesse.
          <select
            defaultValue=""
            disabled={pledge !== undefined}
            className={FIELD}
            {...a11y('memberId', pledge ? memberHintId : undefined)}
          >
            <option value="">{t('form.memberNone')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? t('form.memberUnnamed')}
              </option>
            ))}
          </select>,
          pledge && (
            <p id={memberHintId} className="text-foreground text-sm">
              {t('form.memberFromPledge')}
            </p>
          ),
        )}
      {input('occurredOn', t('form.date'), { type: 'date', max: today })}
      {input('note', t('form.note'), { maxLength: 500, autoComplete: 'off' })}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending || key === ''}
          aria-busy={pending || undefined}
          className={buttonClasses({
            variant: 'secondary',
            size: 'md',
            className: 'disabled:cursor-not-allowed disabled:opacity-60',
          })}
        >
          {t('form.submit')}
        </button>
        <p role="status" className="text-foreground text-sm">
          {saved ? t('form.saved') : ''}
        </p>
      </div>
      {generalError && (
        <p role="alert" className="text-destructive text-sm sm:col-span-2">
          {generalError}
        </p>
      )}
    </form>
  );
}
