// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { LineForm } from './LineForm';

const saveLineAction = vi.fn();
const addLineAction = vi.fn();
vi.mock('../actions', () => ({
  saveLineAction: (...args: unknown[]) => saveLineAction(...args),
  addLineAction: (...args: unknown[]) => addLineAction(...args),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const LINE = {
  id: '22222222-2222-4222-8222-222222222222',
  label: 'Cercueil',
  amounts: { sober: 100_000, intermediate: 200_000, full: 300_000 },
};

function renderForm(line?: typeof LINE) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LineForm dossierId={DOSSIER} line={line} />
    </NextIntlClientProvider>,
  );
}

const input = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

afterEach(() => {
  cleanup();
  saveLineAction.mockReset();
  addLineAction.mockReset();
});

describe('LineForm', () => {
  it('prefills an existing line with its hidden id', () => {
    const { container } = renderForm(LINE);
    expect(input('Nom du poste').value).toBe('Cercueil');
    expect(input('Sobre (FCFA)').value).toBe('100000');
    expect(input('Intermédiaire (FCFA)').value).toBe('200000');
    expect(input('Complet (FCFA)').value).toBe('300000');
    expect(container.querySelector<HTMLInputElement>('input[name="lineId"]')?.value).toBe(LINE.id);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeTruthy();
  });

  it('shows a translated field error, focuses it and keeps the input', async () => {
    saveLineAction.mockResolvedValue({
      error: 'validation',
      fieldErrors: { intermediate: 'invalid number' },
    });
    renderForm(LINE);
    fireEvent.change(input('Intermédiaire (FCFA)'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(messages.lines.errors.invalidNumber);
    const field = input('Intermédiaire (FCFA)');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe(alert.id);
    await waitFor(() => expect(document.activeElement).toBe(field));
    expect(field.value).toBe('abc');
    // WHY: une seule alerte : l'erreur générale est masquée quand un champ porte l'erreur.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shows a lines-specific error', async () => {
    saveLineAction.mockResolvedValue({ error: 'too_many_lines' });
    renderForm(LINE);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      messages.lines.errors.too_many_lines,
    );
  });

  it('empties the form after adding a line', async () => {
    addLineAction.mockResolvedValue({ ok: true });
    const { container } = renderForm();
    expect(container.querySelector('input[name="lineId"]')).toBeNull();
    fireEvent.change(input('Nom du poste'), { target: { value: 'Fleurs' } });
    fireEvent.change(input('Sobre (FCFA)'), { target: { value: '10 000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le poste' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Poste ajouté.'));
    const data = addLineAction.mock.calls[0]?.[1] as FormData;
    expect(data.get('label')).toBe('Fleurs');
    expect(data.get('sober')).toBe('10 000');
    expect(input('Nom du poste').value).toBe('');
    expect(input('Sobre (FCFA)').value).toBe('');
  });
});
