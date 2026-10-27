'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { formatXaf } from '../../format';
import { EntryForm, type MemberOption, type PledgeOption } from './EntryForm';

interface Props {
  dossierId: string;
  locale: string;
  canPledge: boolean;
  canManage: boolean;
  members: readonly MemberOption[];
  pledges: readonly PledgeOption[];
}

/**
 * Formulaires disponibles selon le rôle : promesse (contributeur et plus), cotisation reçue et
 * dépense (trésorier et plus). Chaque formulaire est replié dans un `<details>`.
 *
 * @example
 * <EntryForms dossierId={id} locale="fr" canPledge canManage={false} members={[]} pledges={[]} />
 */
export function EntryForms({ dossierId, locale, canPledge, canManage, members, pledges }: Props) {
  const t = useTranslations('ledger.form');
  if (!canPledge) return null;
  const amountLabel = (amount: number) => formatXaf(amount, locale);
  const block = (title: string, form: ReactNode) => (
    <details className="border-border rounded-2xl border p-4">
      <summary className="text-foreground cursor-pointer font-semibold">{title}</summary>
      <div className="mt-4">{form}</div>
    </details>
  );
  return (
    <div className="space-y-3">
      {block(
        t('pledgeTitle'),
        <EntryForm dossierId={dossierId} kind="pledge" amountLabel={amountLabel} />,
      )}
      {canManage &&
        block(
          t('receiptTitle'),
          <EntryForm
            dossierId={dossierId}
            kind="receipt"
            members={members}
            pledges={pledges}
            amountLabel={amountLabel}
          />,
        )}
      {canManage &&
        block(
          t('expenseTitle'),
          <EntryForm dossierId={dossierId} kind="expense" amountLabel={amountLabel} />,
        )}
    </div>
  );
}
