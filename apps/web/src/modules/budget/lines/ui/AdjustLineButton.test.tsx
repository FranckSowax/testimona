// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { AdjustLineButton } from './AdjustLineButton';

const saveLineAction = vi.fn();
const refresh = vi.fn();
vi.mock('../actions', () => ({
  saveLineAction: (...args: unknown[]) => saveLineAction(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const LINE = '22222222-2222-4222-8222-222222222222';
const TEXT = 'Mettre à jour le poste Tentes et chaises : 300 800 FCFA';

function renderButton() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdjustLineButton
        dossierId={DOSSIER}
        lineId={LINE}
        label="Tentes et chaises"
        amounts={{ sober: 188_000, intermediate: 300_800, full: 451_200 }}
        text={TEXT}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  saveLineAction.mockReset();
  refresh.mockReset();
});

describe('AdjustLineButton', () => {
  it('envoie les trois montants estimés avec le libellé du poste, puis relit la page', async () => {
    saveLineAction.mockResolvedValue({ ok: true });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: TEXT }));
    await waitFor(() => expect(saveLineAction).toHaveBeenCalledTimes(1));
    const data = saveLineAction.mock.calls[0]?.[1] as FormData;
    expect(Object.fromEntries(data.entries())).toEqual({
      dossierId: DOSSIER,
      lineId: LINE,
      label: 'Tentes et chaises',
      sober: '188000',
      intermediate: '300800',
      full: '451200',
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Poste mis à jour.'));
    expect(refresh).toHaveBeenCalled();
  });

  it('affiche une erreur des postes sans relire la page', async () => {
    saveLineAction.mockResolvedValue({ error: 'closed' });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: TEXT }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
