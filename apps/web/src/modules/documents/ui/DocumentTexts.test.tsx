// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import { DocumentTexts } from './DocumentTexts';

const { generate, save } = vi.hoisted(() => ({ generate: vi.fn(), save: vi.fn() }));
vi.mock('@/modules/ai/actions', () => ({ generateDocumentTextsAction: generate }));
vi.mock('../actions', () => ({ saveDocumentTextAction: save }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const text = messages.documents.synthesis;
const FACTS_HREF = `/dossier/${DOSSIER}/etape/biography`;
const TEXTS = {
  cover: { saved: null, starter: 'Couverture de départ' },
  tribute: { saved: null, starter: '' },
  thanks: { saved: 'Merci à tous', starter: 'Remerciements de départ' },
};

function renderTexts(props: Partial<ComponentProps<typeof DocumentTexts>> = {}) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <DocumentTexts
        dossierId={DOSSIER}
        texts={TEXTS}
        canEdit
        aiEnabled
        factsHref={FACTS_HREF}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const field = (label: string) => screen.getByLabelText(label) as HTMLTextAreaElement;
const saveButton = (label: string) =>
  screen.getByRole('button', { name: `Enregistrer : ${label}` }) as HTMLButtonElement;
const aiButton = () => screen.getByRole('button', { name: text.generate });

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('DocumentTexts', () => {
  it('part du texte enregistré, sinon du texte de départ ; l’hommage est vide', () => {
    renderTexts();
    expect(field(text.text.cover).value).toBe('Couverture de départ');
    expect(field(text.text.tribute).value).toBe('');
    expect(field(text.text.thanks).value).toBe('Merci à tous');
    expect(screen.getByText(`${'Couverture de départ'.length} / 200 caractères`)).toBeTruthy();
    expect(field(text.text.tribute).getAttribute('maxlength')).toBe('1500');
    // Un texte de départ reste à enregistrer ; un texte enregistré et inchangé, non.
    expect(saveButton(text.text.cover).disabled).toBe(false);
    expect(saveButton(text.text.thanks).disabled).toBe(true);
  });

  it('masque le bouton IA quand l’IA n’est pas configurée', () => {
    renderTexts({ aiEnabled: false });
    expect(screen.queryByRole('button', { name: text.generate })).toBeNull();
  });

  it('en lecture seule : ni IA ni enregistrement, champs non modifiables, sans texte de départ', () => {
    renderTexts({ canEdit: false });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(text.readOnly)).toBeTruthy();
    expect(field(text.text.thanks).hasAttribute('readonly')).toBe(true);
    // Un texte jamais écrit : « Pas encore écrit », sans champ vide ni compteur « 0 / 200 ».
    expect(screen.queryByLabelText(text.text.cover)).toBeNull();
    expect(screen.getAllByText(text.notWritten)).toHaveLength(2);
    expect(screen.queryByText('0 / 200 caractères')).toBeNull();
  });

  // WHY: filet de sécurité. Pendant l'appel, les champs sont en lecture seule et un utilisateur
  // ne peut pas les modifier ; `fireEvent.change` contourne ce verrou pour vérifier que, si un
  // texte changeait malgré tout (autre chemin de saisie), la proposition ne l'écraserait pas.
  it('remplace les textes proposés sauf celui modifié pendant l’appel, sans enregistrer', async () => {
    let resolve: (value: unknown) => void = () => {};
    generate.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTexts();
    fireEvent.click(aiButton());
    await waitFor(() => expect(field(text.text.cover).hasAttribute('readonly')).toBe(true));
    expect(generate).toHaveBeenCalledWith({ dossierId: DOSSIER });
    fireEvent.change(field(text.text.thanks), { target: { value: 'Merci, modifié' } });
    await act(async () => {
      resolve({
        ok: true,
        texts: { cover: 'IA couverture', tribute: 'IA hommage', thanks: 'IA merci' },
      });
    });
    await waitFor(() => expect(field(text.text.cover).value).toBe('IA couverture'));
    expect(field(text.text.tribute).value).toBe('IA hommage');
    expect(field(text.text.thanks).value).toBe('Merci, modifié');
    expect(field(text.text.cover).hasAttribute('readonly')).toBe(false);
    expect(screen.getByText(`${text.generated} ${text.keptEdited}`)).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it('affiche l’erreur de quota et garde les textes', async () => {
    generate.mockResolvedValue({ ok: false, error: 'quota' });
    renderTexts();
    fireEvent.click(aiButton());
    const alert = await screen.findByText(text.ai.quota);
    expect(alert.getAttribute('role')).toBe('alert');
    expect(field(text.text.cover).value).toBe('Couverture de départ');
  });

  it('invite à réessayer quand l’appel échoue', async () => {
    generate.mockRejectedValue(new Error('network'));
    renderTexts();
    fireEvent.click(aiButton());
    expect(await screen.findByText(text.ai.failed)).toBeTruthy();
  });

  it('demande le prénom ou la biographie quand l’IA manque de faits, avec un lien', async () => {
    generate.mockResolvedValue({ ok: false, error: 'validation' });
    renderTexts();
    fireEvent.click(aiButton());
    expect(await screen.findByText(text.ai.missingFacts)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: text.ai.missingFactsLink }).getAttribute('href'),
    ).toContain(FACTS_HREF);
  });

  it('explique un refus de rôle', async () => {
    generate.mockResolvedValue({ ok: false, error: 'forbidden' });
    renderTexts();
    fireEvent.click(aiButton());
    expect(await screen.findByText(text.ai.forbidden)).toBeTruthy();
    expect(screen.queryByRole('link', { name: text.ai.missingFactsLink })).toBeNull();
  });

  it('un double clic ne lance qu’un appel, et l’enregistrement est bloqué pendant l’appel', async () => {
    let resolve: (value: unknown) => void = () => {};
    generate.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTexts();
    fireEvent.click(aiButton());
    fireEvent.click(screen.getByRole('button', { name: text.generating }));
    expect(generate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(saveButton(text.text.cover).disabled).toBe(true));
    fireEvent.click(saveButton(text.text.cover));
    expect(save).not.toHaveBeenCalled();
    await act(async () => resolve({ ok: false, error: 'failed' }));
    await waitFor(() => expect(saveButton(text.text.cover).disabled).toBe(false));
  });

  it('enregistre un texte, nettoyé, et l’annonce', async () => {
    save.mockResolvedValue({ ok: true, data: { key: 'documents.booklet.tribute' } });
    renderTexts();
    fireEvent.change(field(text.text.tribute), { target: { value: '  Une vie de partage.  ' } });
    fireEvent.click(saveButton(text.text.tribute));
    const status = await screen.findByText(text.saved);
    expect(status.getAttribute('role')).toBe('status');
    expect(save).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      kind: 'tribute',
      text: '  Une vie de partage.  ',
    });
    expect(field(text.text.tribute).value).toBe('Une vie de partage.');
    expect(saveButton(text.text.tribute).disabled).toBe(true);
  });

  it('affiche l’erreur précise quand l’enregistrement est refusé', async () => {
    save.mockResolvedValue({ ok: false, error: 'validation', fieldErrors: { '': 'too long' } });
    renderTexts();
    fireEvent.click(saveButton(text.text.cover));
    const alert = await screen.findByText(messages.journey.ui.tooLarge);
    expect(alert.getAttribute('role')).toBe('alert');
  });
});
