// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../messages/fr.json';
import { DocumentsSynthesis } from './DocumentsSynthesis';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/modules/ai/actions', () => ({ generateDocumentTextsAction: vi.fn() }));
vi.mock('../actions', () => ({ saveDocumentTextAction: vi.fn() }));
vi.mock('../photo/actions', () => ({
  preparePhotoAction: vi.fn(),
  setDossierPhotoAction: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseBrowser: vi.fn() }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const text = messages.documents.synthesis;
const READY = { 'booklet.pdf': [], 'poster.pdf': [], 'poster.png': [] };

function renderSynthesis(props: Partial<ComponentProps<typeof DocumentsSynthesis>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <DocumentsSynthesis
        dossierId={DOSSIER}
        locale="fr"
        style="color"
        photoId={null}
        canEdit
        canEditPhoto
        aiEnabled
        texts={{
          cover: { saved: 'Couverture', starter: 'Départ' },
          tribute: { saved: null, starter: '' },
          thanks: { saved: 'Merci', starter: 'Départ' },
        }}
        readiness={READY}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

const format = (name: string) => screen.getByRole('region', { name });

afterEach(cleanup);

describe('DocumentsSynthesis', () => {
  it('affiche le titre et la présentation choisie avec un lien pour la modifier', () => {
    renderSynthesis();
    expect(screen.getByRole('heading', { level: 1, name: 'Livret et affiche' })).toBeTruthy();
    expect(screen.getByText('Présentation : Couleur')).toBeTruthy();
    expect(screen.getByRole('link', { name: text.editStyle }).getAttribute('href')).toContain(
      `/dossier/${DOSSIER}/etape/funeral-documents?q=0`,
    );
  });

  it('liste ce qui manque avec un lien pour le compléter, sans lien de téléchargement', () => {
    renderSynthesis({
      readiness: {
        'booklet.pdf': ['name', 'program', 'tribute'],
        'poster.pdf': ['program'],
        'poster.png': ['program'],
      },
    });
    const booklet = format(text.format.booklet);
    expect(within(booklet).getByText(messages.documents.missing.intro)).toBeTruthy();
    expect(within(booklet).getByText(messages.documents.missing.tribute)).toBeTruthy();
    expect(
      within(booklet).getByRole('link', { name: text.fix.name }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}`);
    expect(
      within(booklet).getByRole('link', { name: text.fix.program }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}/etape/ceremony-program?q=`);
    expect(within(booklet).getByRole('link', { name: text.fix.tribute }).getAttribute('href')).toBe(
      '#documents-text-tribute',
    );
    expect(
      within(format(text.format.posterPng)).getByText(messages.documents.missing.program),
    ).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Télécharger/ })).toBeNull();
  });

  it('propose un lien de téléchargement par format prêt', () => {
    renderSynthesis();
    const links = [
      [text.format.booklet, 'booklet.pdf'],
      [text.format.posterPdf, 'poster.pdf'],
      [text.format.posterPng, 'poster.png'],
    ] as const;
    for (const [name, doc] of links) {
      const link = screen.getByRole('link', { name: `Télécharger : ${name}` });
      expect(link.getAttribute('href')).toBe(`/api/dossiers/${DOSSIER}/documents/${doc}?lang=fr`);
      expect(link.hasAttribute('download')).toBe(true);
    }
    expect(screen.queryByText(messages.documents.missing.intro)).toBeNull();
  });

  it('affiche la vignette de la photo courante, ou « Pas de photo »', () => {
    renderSynthesis({ photoId: PHOTO });
    expect(screen.getByRole('img', { name: text.photoAlt }).getAttribute('src')).toBe(
      `/api/dossiers/${DOSSIER}/photo?v=${PHOTO}`,
    );
    cleanup();
    renderSynthesis();
    expect(screen.getByText(text.noPhoto)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('propose l’envoi de photo au coordinateur', () => {
    renderSynthesis();
    expect(screen.getByLabelText(messages.documents.photo.label)).toBeTruthy();
  });

  it('ne propose ni envoi de photo, ni enregistrement, ni IA à un lecteur', () => {
    renderSynthesis({
      canEdit: false,
      canEditPhoto: false,
      readiness: { ...READY, 'booklet.pdf': ['tribute'] },
    });
    expect(screen.queryByLabelText(messages.documents.photo.label)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link', { name: text.editStyle })).toBeNull();
    expect(screen.queryByRole('link', { name: text.fix.tribute })).toBeNull();
    expect(screen.getByLabelText(text.text.cover).hasAttribute('readonly')).toBe(true);
    expect(screen.getByRole('link', { name: /Retour au dossier/ })).toBeTruthy();
  });
});
