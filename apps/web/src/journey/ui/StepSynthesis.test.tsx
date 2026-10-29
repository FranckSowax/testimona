// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/fr.json';
import { estimateFor } from '../quantities';
import { StepSynthesis } from './StepSynthesis';

vi.mock('@/modules/budget/lines/actions', () => ({ saveLineAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const estimate = estimateFor('vigil-setup', {
  'attendance.close': 40,
  'attendance.extended': 60,
  'attendance.friends': 30,
  'attendance.community': 20,
  'attendance.nights': 2,
  'vigil.shelter': 'tents',
  'vigil.seating': 'chairs',
  'vigil.sound': 'yes',
});
const line = (id: string, gridKey: string, label: string) => ({
  id,
  gridKey,
  label,
  amounts: { sober: 0, intermediate: 1, full: 0 },
  edited: false,
  position: 0,
});

function renderSynthesis(props: Partial<ComponentProps<typeof StepSynthesis>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <StepSynthesis
        dossierId={DOSSIER}
        locale="fr"
        stepId="vigil-setup"
        estimate={estimate}
        adjustments={null}
        canAnswer
        panel={{ city: 'Libreville', groups: [] }}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('StepSynthesis', () => {
  it('affiche les quantités et le coût estimé au niveau choisi', () => {
    renderSynthesis();
    expect(
      screen.getByRole('heading', { level: 1, name: "L'installation de la veillée" }),
    ).toBeTruthy();
    expect(screen.getByText('4 tentes de 5 × 10 m')).toBeTruthy();
    expect(screen.getByText('188 chaises')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Coût estimé (Intermédiaire)' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Tentes et chaises' })).toBeTruthy();
    expect(screen.getByText(/300\s800/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it("renvoie vers l'affluence sans réponse à B.1", () => {
    renderSynthesis({ estimate: null });
    expect(
      screen.getByText(
        "Indiquez d'abord combien de personnes sont attendues : les quantités en dépendent.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Répondre aux personnes attendues' }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}/etape/attendance`);
  });

  it("propose au trésorier les postes à mettre à jour, ou dit qu'ils sont à jour", () => {
    renderSynthesis({
      adjustments: [
        {
          gridKey: 'tentsChairs',
          line: line('00000000-0000-4000-8000-000000000001', 'tentsChairs', 'Tentes et chaises'),
          amounts: { sober: 188_000, intermediate: 300_800, full: 451_200 },
          upToDate: false,
        },
        {
          gridKey: 'sound',
          line: line('00000000-0000-4000-8000-000000000002', 'sound', 'Sonorisation'),
          amounts: { sober: 150_000, intermediate: 300_000, full: 600_000 },
          upToDate: true,
        },
      ],
    });
    expect(
      screen.getByRole('button', { name: /Mettre à jour le poste Tentes et chaises : 300\s800/ }),
    ).toBeTruthy();
    expect(
      screen.getByText('Le poste Sonorisation correspond déjà à cette estimation.'),
    ).toBeTruthy();
  });

  it('masque le lien de modification à un lecteur', () => {
    renderSynthesis({ canAnswer: false });
    expect(screen.queryByRole('link', { name: 'Modifier les réponses' })).toBeNull();
    expect(screen.getByRole('link', { name: /Retour au dossier/ })).toBeTruthy();
  });
});
