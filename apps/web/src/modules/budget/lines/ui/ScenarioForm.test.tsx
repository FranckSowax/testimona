// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { ScenarioForm } from './ScenarioForm';

const chooseScenarioAction = vi.fn();
vi.mock('../actions', () => ({
  chooseScenarioAction: (...args: unknown[]) => chooseScenarioAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const totals = { sober: '1 000 FCFA', intermediate: '2 000 FCFA', full: '3 000 FCFA' };

function renderForm(scenario: 'sober' | 'intermediate' | 'full' | null) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ScenarioForm dossierId={DOSSIER} scenario={scenario} totals={totals} />
    </NextIntlClientProvider>,
  );
}

const radio = (name: RegExp) => screen.getByRole('radio', { name }) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le scénario' }));

afterEach(() => {
  cleanup();
  chooseScenarioAction.mockReset();
});

describe('ScenarioForm', () => {
  it('checks the current scenario and shows each total', () => {
    renderForm('intermediate');
    expect(radio(/^Intermédiaire : 2 000 FCFA$/).checked).toBe(true);
    expect(radio(/^Sobre/).checked).toBe(false);
    expect(radio(/Aucun scénario retenu/).checked).toBe(false);
  });

  it('checks « Aucun scénario retenu » when none is chosen', () => {
    renderForm(null);
    expect(radio(/Aucun scénario retenu/).checked).toBe(true);
  });

  it('sends the chosen scenario and says it is saved', async () => {
    chooseScenarioAction.mockResolvedValue({ ok: true });
    renderForm(null);
    fireEvent.click(radio(/^Complet/));
    save();
    await waitFor(() => expect(chooseScenarioAction).toHaveBeenCalledTimes(1));
    const data = chooseScenarioAction.mock.calls[0]?.[1] as FormData;
    expect(data.get('scenario')).toBe('full');
    expect(data.get('dossierId')).toBe(DOSSIER);
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Scénario enregistré.'),
    );
  });

  it('keeps the person’s choice after an error', async () => {
    chooseScenarioAction.mockResolvedValue({ error: 'forbidden' });
    renderForm('sober');
    fireEvent.click(radio(/^Complet/));
    save();
    expect((await screen.findByRole('alert')).textContent).toBe(messages.dossier.errors.forbidden);
    expect(radio(/^Complet/).checked).toBe(true);
  });
});
