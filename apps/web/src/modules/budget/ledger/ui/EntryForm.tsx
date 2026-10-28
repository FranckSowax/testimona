'use client';

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { saveEntryAction, type LedgerFormState } from '../actions';
import { ENTRY_METHODS, ledgerToday } from '../schema';
import { prefillExpense } from '../../receipts/ui/prefillExpense';
import { ReceiptCapture } from '../../receipts/ui/ReceiptCapture';
import { EntryFormActions } from './EntryFormActions';
import { useEntryLock } from './useEntryLock';
import { FIELD, useEntryFields } from './useEntryFields';
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

/** Poste du budget proposé pour rattacher une dépense. */
export interface LineOption {
  id: string;
  label: string;
}

interface Props {
  dossierId: string;
  kind: 'pledge' | 'receipt' | 'expense';
  members?: readonly MemberOption[];
  pledges?: readonly PledgeOption[];
  lines?: readonly LineOption[];
  /** Propose la photo d'un reçu (dépense, trésorier et plus). */
  withReceipt?: boolean;
  amountLabel: (amount: number) => string;
}

/**
 * Saisie d'une promesse, d'une cotisation reçue ou d'une dépense.
 *
 * @example
 * <EntryForm dossierId={id} kind="pledge" amountLabel={(n) => formatXaf(n, 'fr')} />
 */
export function EntryForm({
  dossierId,
  kind,
  members = [],
  pledges = [],
  lines = [],
  withReceipt = false,
  amountLabel,
}: Props) {
  const t = useTranslations('ledger');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<LedgerFormState | null, FormData>(
    saveEntryAction,
    null,
  );
  const [key, renew] = useIdempotencyKey();
  const [today, setToday] = useState<string | undefined>(undefined);
  const [pledgeId, setPledgeId] = useState('');
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // Dernier nom recopié d'une promesse, pour le remplacer tant que la personne n'y a pas touché.
  const prefilledName = useRef('');
  const withCapture = withReceipt && kind === 'expense';
  const [receiptId, setReceiptId] = useState('');
  // WHY: change après chaque enregistrement, pour remonter une prise de photo vide.
  const [captureKey, setCaptureKey] = useState(0);
  const [receiptBusy, setReceiptBusy] = useState(false);
  // WHY: un nouvel essai renvoie exactement la saisie enregistrée, avec la même clé.
  const lastData = useRef<FormData | null>(null);
  const { lock, actionRef, release, visibleState } = useEntryLock(formRef, state, withCapture);

  const clearForm = useCallback(() => {
    formRef.current?.reset();
    prefilledName.current = '';
    setPledgeId('');
    setReceiptId('');
    setCaptureKey((k) => k + 1);
    renew();
  }, [renew]);

  // WHY: calculée au montage, comme la clé, pour éviter un écart serveur/navigateur à minuit.
  useEffect(() => setToday(ledgerToday()), []);
  useEffect(() => {
    if (state?.ok) {
      clearForm();
      setSaved(true);
    } else if (state?.fieldErrors) {
      // WHY: le focus va au premier champ à corriger, que le lecteur d'écran annonce.
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state, clearForm]);

  // WHY: onSubmit plutôt que `<form action>` : React 19 vide le formulaire après chaque action,
  // même en erreur, et la personne perdrait sa saisie.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending || key === '' || receiptBusy || lock) return;
    const data = new FormData(e.currentTarget);
    lastData.current = data;
    startTransition(() => formAction(data));
  };
  const onRetry = () => {
    const data = lastData.current;
    if (pending || !data) return;
    startTransition(() => formAction(data));
  };
  // WHY: la dépense est enregistrée sans son reçu ; on repart d'un formulaire vide, nouvelle clé.
  const onContinue = () => {
    clearForm();
    setSaved(false);
    release();
  };
  // WHY: effacé à la saisie suivante, pour que le prochain succès soit annoncé de nouveau.
  const clearSaved = () => setSaved(false);

  const pledge = pledges.find((p) => p.id === pledgeId);
  const onPledgeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPledgeId(e.target.value);
    const chosen = pledges.find((p) => p.id === e.target.value);
    if (!chosen) return;
    const elements = formRef.current?.elements;
    const name = elements?.namedItem('partyName');
    const untouched = (value: string) => value.trim() === '' || value === prefilledName.current;
    if (name instanceof HTMLInputElement && untouched(name.value)) {
      name.value = chosen.label;
      prefilledName.current = chosen.label;
    }
    // WHY: le membre vient de la promesse ; un choix resté dans la liste désactivée tromperait.
    const member = elements?.namedItem('memberId');
    if (member instanceof HTMLSelectElement) member.value = '';
  };
  const digits = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR');

  const showMethod = kind !== 'pledge';
  const showMember = kind === 'receipt';
  const showPledge = kind === 'receipt' && pledges.length > 0;
  const showLine = kind === 'expense' && lines.length > 0;
  const shown = [
    'partyName',
    'amount',
    'occurredOn',
    'note',
    ...(showMethod ? ['method'] : []),
    ...(showMember ? ['memberId'] : []),
    ...(showPledge ? ['pledgeId'] : []),
    ...(showLine ? ['budgetLineId'] : []),
  ];

  const { uid, a11y, wrap, input, generalError } = useEntryFields(visibleState, shown);
  const memberHintId = `${uid}-memberId-hint`;

  return (
    <form ref={formRef} onSubmit={onSubmit} onChange={clearSaved} className="space-y-3" noValidate>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="idempotencyKey" value={key} />
      {withCapture && <input type="hidden" name="receiptId" value={receiptId} />}
      {/* WHY: figés quand la dépense est enregistrée sans son reçu (voir useEntryLock). */}
      <fieldset disabled={lock !== null} className="grid min-w-0 gap-3 sm:grid-cols-2">
        {withCapture && (
          <div className="sm:col-span-2">
            <ReceiptCapture
              key={captureKey}
              dossierId={dossierId}
              disabled={pending}
              onBusyChange={setReceiptBusy}
              onAttach={(id) => setReceiptId(id ?? '')}
              onRead={(prefill) => prefillExpense(formRef.current, prefill)}
            />
          </div>
        )}
        {input('partyName', kind === 'expense' ? t('form.supplier') : t('form.party'), {
          required: true,
          maxLength: 120,
          autoComplete: 'off',
        })}
        {input('amount', t('form.amount'), {
          required: true,
          inputMode: 'numeric',
          autoComplete: 'off',
          placeholder: pledge ? digits.format(pledge.amount) : undefined,
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
        {showLine &&
          wrap(
            'budgetLineId',
            t('form.budgetLine'),
            <select defaultValue="" className={FIELD} {...a11y('budgetLineId')}>
              <option value="">{t('form.budgetLineNone')}</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
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
      </fieldset>
      <EntryFormActions
        lock={lock}
        pending={pending}
        blocked={key === '' || receiptBusy}
        saved={saved}
        actionRef={actionRef}
        onRetry={onRetry}
        onContinue={onContinue}
      />
      {generalError && (
        <p role="alert" className="text-destructive text-sm">
          {generalError}
        </p>
      )}
    </form>
  );
}
