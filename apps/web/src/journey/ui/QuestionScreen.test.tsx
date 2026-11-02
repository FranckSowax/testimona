// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/fr.json';
import { findQuestion } from '../registry';
import type { ListItem } from '../types';
import { QuestionScreen } from './QuestionScreen';

vi.mock('@/modules/dossier/answers/actions', () => ({ saveAnswerAction: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const STARTER: ListItem[] = [
  { time: '08:00', moment: 'Accueil des proches', place: '', lead: '' },
  { time: '08:30', moment: 'Levée du corps', place: 'Morgue', lead: '' },
];
const USE_STARTER = "Partir d'un programme type";

function renderScreen(props: { stored?: unknown; readOnly?: boolean; starter?: ListItem[] }) {
  const question = findQuestion('ceremony.program')?.question;
  if (!question) throw new Error('question absente');
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <QuestionScreen
        dossierId={DOSSIER}
        question={question}
        index={5}
        total={6}
        title="Programme"
        hint=""
        stored={props.stored}
        readOnly={props.readOnly ?? false}
        countries={[{ code: 'GA', label: 'Gabon' }]}
        backHref="/back"
        nextHref={null}
        starter={props.starter}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('QuestionScreen : programme type', () => {
  it('propose le programme type sur une liste vide', () => {
    renderScreen({ starter: STARTER });
    expect(screen.getByRole('button', { name: USE_STARTER })).toBeTruthy();
  });

  it('remplit la liste au clic, puis retire le bouton', () => {
    renderScreen({ starter: STARTER });
    fireEvent.click(screen.getByRole('button', { name: USE_STARTER }));
    const times = screen.getAllByLabelText('Heure') as HTMLInputElement[];
    expect(times.map((input) => input.value)).toEqual(['08:00', '08:30']);
    const moments = screen.getAllByLabelText('Moment') as HTMLInputElement[];
    expect(moments.map((input) => input.value)).toEqual(['Accueil des proches', 'Levée du corps']);
    expect(screen.queryByRole('button', { name: USE_STARTER })).toBeNull();
  });

  it('donne le focus au premier champ « Heure » après le clic', () => {
    renderScreen({ starter: STARTER });
    fireEvent.click(screen.getByRole('button', { name: USE_STARTER }));
    expect(document.activeElement).toBe(screen.getAllByLabelText('Heure')[0]);
  });

  it('reste proposé quand la liste a été passée', () => {
    renderScreen({ starter: STARTER, stored: { skipped: true } });
    expect(screen.getByRole('button', { name: USE_STARTER })).toBeTruthy();
  });

  it('efface l’erreur affichée au clic', () => {
    renderScreen({ starter: STARTER });
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: USE_STARTER }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('n’apparaît pas si un moment existe déjà', () => {
    renderScreen({ starter: STARTER, stored: [{ time: '09:00', moment: 'Messe' }] });
    expect(screen.queryByRole('button', { name: USE_STARTER })).toBeNull();
  });

  it('disparaît dès qu’un moment est saisi', () => {
    renderScreen({ starter: STARTER });
    fireEvent.change(screen.getByLabelText('Moment'), { target: { value: 'Messe' } });
    expect(screen.queryByRole('button', { name: USE_STARTER })).toBeNull();
  });

  it('n’apparaît ni en lecture seule ni sans programme type', () => {
    renderScreen({ starter: STARTER, readOnly: true, stored: [] });
    expect(screen.queryByRole('button', { name: USE_STARTER })).toBeNull();
    cleanup();
    renderScreen({});
    expect(screen.queryByRole('button', { name: USE_STARTER })).toBeNull();
  });
});
