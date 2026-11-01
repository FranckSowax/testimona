// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ListQuestion } from '../../types';
import { ListInput } from './ListInput';

const question: ListQuestion = {
  kind: 'list',
  key: 'ceremony.program',
  maxItems: 3,
  fields: [
    { name: 'time', kind: 'time', required: true },
    { name: 'moment', kind: 'shortText', required: true },
  ],
};

// WHY: messages minimaux, indépendants des textes de l'étape 3.4 (ajoutés plus tard).
const messages = {
  journey: {
    q: {
      ceremony: {
        program: {
          fields: { time: { label: 'Heure' }, moment: { label: 'Moment' } },
        },
      },
    },
    ui: {
      item: 'Élément {n}',
      addItem: 'Ajouter',
      removeItem: 'Retirer',
      removeItemN: 'Retirer l’élément {n}',
      chooseOption: 'Choisir',
    },
  },
};

function renderList(readOnly: boolean, onChange = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ListInput
        id="question-input"
        question={question}
        value={[{ time: '08:30', moment: 'Accueil' }]}
        onChange={onChange}
        readOnly={readOnly}
        invalid={false}
        labelledBy="question-title"
        describedBy={undefined}
        invalidIds={[]}
        busy={false}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('ListInput : champ heure', () => {
  it('affiche une saisie d’heure avec son libellé', () => {
    renderList(false);
    const input = screen.getByLabelText('Heure') as HTMLInputElement;
    expect(input.type).toBe('time');
    expect(input.value).toBe('08:30');
    expect(input.readOnly).toBe(false);
  });

  it('passe en lecture seule', () => {
    renderList(true);
    const input = screen.getByLabelText('Heure') as HTMLInputElement;
    expect(input.type).toBe('time');
    expect(input.readOnly).toBe(true);
  });

  it('transmet la nouvelle heure saisie', () => {
    const onChange = vi.fn();
    renderList(false, onChange);
    fireEvent.change(screen.getByLabelText('Heure'), { target: { value: '09:15' } });
    expect(onChange).toHaveBeenCalledWith([{ time: '09:15', moment: 'Accueil' }]);
  });
});
