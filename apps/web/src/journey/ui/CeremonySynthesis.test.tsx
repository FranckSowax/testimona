// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/fr.json';
import { SKIPPED } from '../types';
import { CeremonySynthesis } from './CeremonySynthesis';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/modules/providers/quote-actions', () => ({ requestQuoteAction: vi.fn() }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const ANSWERS = {
  'ceremony.date': '2026-11-14',
  'ceremony.liftPlace': 'Morgue de Libreville',
  'ceremony.servicePlace': 'ici',
  'ceremony.program': [
    { time: '10:00', moment: 'Office religieux', place: 'Cathédrale Sainte-Marie' },
    { time: '08:00', moment: 'Accueil des proches', lead: 'Awa' },
    { time: '13:30', moment: 'Inhumation', place: 'là' },
  ],
};

function renderSynthesis(props: Partial<ComponentProps<typeof CeremonySynthesis>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <CeremonySynthesis
        dossierId={DOSSIER}
        locale="fr"
        answers={ANSWERS}
        canAnswer
        panel={{ city: 'Libreville', groups: [], quote: null }}
        quotes={[]}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('CeremonySynthesis', () => {
  it('affiche le titre et la date des obsèques en toutes lettres', () => {
    renderSynthesis();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Le déroulé de la cérémonie' }),
    ).toBeTruthy();
    expect(screen.getByText('samedi 14 novembre 2026')).toBeTruthy();
  });

  it('indique une date à préciser sans réponse valide', () => {
    renderSynthesis({ answers: { ...ANSWERS, 'ceremony.date': SKIPPED } });
    expect(screen.getByText('Date à préciser')).toBeTruthy();
  });

  it('liste les lieux avec un itinéraire Maps dans un nouvel onglet quand il est exploitable', () => {
    renderSynthesis();
    expect(screen.getByText('Morgue de Libreville')).toBeTruthy();
    const lift = screen.getByRole('link', {
      name: 'Itinéraire : Levée du corps (Google Maps, nouvel onglet)',
    });
    expect(lift.getAttribute('href')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Morgue%20de%20Libreville',
    );
    expect(lift.getAttribute('target')).toBe('_blank');
    expect(lift.getAttribute('rel')).toBe('noopener noreferrer');
    // « ici » n'est pas une adresse exploitable : texte affiché, sans lien.
    expect(screen.getByText('ici')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Itinéraire : Cérémonie/ })).toBeNull();
    expect(screen.queryByText('Inhumation', { selector: 'dt' })).toBeNull();
  });

  it('distingue par l’heure les liens de deux moments au même intitulé', () => {
    const place = 'Cathédrale Sainte-Marie';
    renderSynthesis({
      answers: {
        'ceremony.program': [
          { time: '15:00', moment: 'Prière', place },
          { time: '09:00', moment: 'Prière', place },
        ],
      },
    });
    const names = screen
      .getAllByRole('link', { name: /Itinéraire/ })
      .map((link) => link.getAttribute('aria-label'));
    expect(names).toEqual([
      'Itinéraire : 09:00 Prière (Google Maps, nouvel onglet)',
      'Itinéraire : 15:00 Prière (Google Maps, nouvel onglet)',
    ]);
  });

  it('n’affiche aucun lien pour un lieu en lien vers un autre site', () => {
    const foreign = 'https://evil.example/goo.gl';
    renderSynthesis({
      answers: {
        'ceremony.liftPlace': foreign,
        'ceremony.program': [{ time: '08:00', moment: 'Accueil', place: foreign }],
      },
    });
    expect(screen.getAllByText(foreign)).toHaveLength(2);
    expect(screen.queryAllByRole('link', { name: /Itinéraire/ })).toEqual([]);
    expect(document.querySelector('a[href*="evil.example"]')).toBeNull();
  });

  it('dit que les lieux manquent sans réponse', () => {
    renderSynthesis({ answers: { 'ceremony.program': ANSWERS['ceremony.program'] } });
    expect(screen.getByText('Les lieux ne sont pas encore indiqués.')).toBeTruthy();
  });

  it('présente le programme trié par heure dans un tableau à en-têtes', () => {
    renderSynthesis();
    const table = screen.getByRole('table', { name: 'Programme de la journée' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['Heure', 'Moment', 'Lieu', 'Conduit par']);
    const moments = within(table)
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent);
    expect(moments).toEqual(['Accueil des proches', 'Office religieux', 'Inhumation']);
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1] as HTMLElement).getByText('08:00')).toBeTruthy();
    expect(within(rows[1] as HTMLElement).getByText('Awa')).toBeTruthy();
  });

  it('met un lien Maps sur le lieu d’un moment seulement s’il est exploitable', () => {
    renderSynthesis();
    const office = screen.getByRole('link', {
      name: 'Itinéraire : 10:00 Office religieux (Google Maps, nouvel onglet)',
    });
    expect(office.getAttribute('href')).toContain('destination=Cath%C3%A9drale');
    expect(office.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('là')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Itinéraire : Inhumation/ })).toBeNull();
  });

  it('propose d’écrire le programme quand il est vide', () => {
    renderSynthesis({ answers: { 'ceremony.date': '2026-11-14' } });
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText("Le programme de la journée n'est pas encore écrit.")).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Écrire le programme' }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}/etape/ceremony-program?q=5`);
  });

  it('ne propose aucun lien d’édition à un lecteur', () => {
    renderSynthesis({ answers: {}, canAnswer: false });
    expect(screen.queryByRole('link', { name: 'Écrire le programme' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Modifier les réponses' })).toBeNull();
    expect(screen.getByRole('link', { name: /Retour au dossier/ })).toBeTruthy();
  });

  it('donne à qui peut répondre le lien de modification des réponses', () => {
    renderSynthesis();
    expect(
      screen.getByRole('link', { name: 'Modifier les réponses' }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}/etape/ceremony-program`);
  });

  it('liste les devis demandés pour l’étape', () => {
    renderSynthesis({
      quotes: [
        {
          id: 'q1',
          providerName: 'Pompes funèbres Akanda',
          author: 'Awa',
          createdAt: '2026-10-29T10:00:00Z',
        },
      ],
    });
    expect(screen.getByRole('heading', { name: 'Devis demandés' })).toBeTruthy();
    expect(screen.getByText(/Pompes funèbres Akanda, le 29 octobre 2026/)).toBeTruthy();
  });
});
