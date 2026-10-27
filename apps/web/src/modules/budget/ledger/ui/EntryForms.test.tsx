// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { EntryForms } from './EntryForms';

vi.mock('../actions', () => ({ saveEntryAction: vi.fn() }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const t = messages.ledger.form;

function renderForms(canPledge: boolean, canManage: boolean) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <EntryForms
        dossierId={DOSSIER}
        locale="fr"
        canPledge={canPledge}
        canManage={canManage}
        members={[]}
        pledges={[]}
        lines={[{ id: 'l1', label: 'Traiteur' }]}
      />
    </NextIntlClientProvider>,
  );
}

const titles = () => Array.from(document.querySelectorAll('summary'), (s) => s.textContent ?? '');

afterEach(cleanup);

describe('EntryForms', () => {
  it('offers only the pledge form to a contributor', () => {
    renderForms(true, false);
    expect(titles()).toEqual([t.pledgeTitle]);
  });

  it('offers the pledge, receipt and expense forms to a treasurer', () => {
    renderForms(true, true);
    expect(titles()).toEqual([t.pledgeTitle, t.receiptTitle, t.expenseTitle]);
    expect(screen.getAllByRole('button', { name: t.submit, hidden: true })).toHaveLength(3);
    // Le choix du poste n'apparaît que dans le formulaire de dépense.
    expect(screen.getAllByLabelText(t.budgetLine)).toHaveLength(1);
  });

  it('offers nothing to a viewer', () => {
    const { container } = renderForms(false, false);
    expect(container.innerHTML).toBe('');
  });
});
