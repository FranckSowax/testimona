// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { prefillExpense } from './prefillExpense';

const LINE = '55555555-5555-4555-8555-555555555555';

function form(values: Record<string, string> = {}) {
  const el = document.createElement('form');
  el.innerHTML = `
    <input name="partyName" value="${values.partyName ?? ''}" />
    <input name="amount" value="${values.amount ?? ''}" />
    <input name="occurredOn" type="date" value="${values.occurredOn ?? ''}" />
    <select name="budgetLineId"><option value="">-</option><option value="${LINE}">Cercueil</option></select>`;
  return el;
}
const value = (el: HTMLFormElement, name: string) =>
  (el.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value;
const prefill = {
  amount: 45_000,
  occurredOn: '2026-10-20',
  partyName: 'Pompes funèbres Mba',
  budgetLineId: LINE,
};

describe('prefillExpense', () => {
  it('remplit les champs vides avec la lecture', () => {
    const el = form();
    prefillExpense(el, prefill);
    expect(value(el, 'amount')).toBe('45000');
    expect(value(el, 'occurredOn')).toBe('2026-10-20');
    expect(value(el, 'partyName')).toBe('Pompes funèbres Mba');
    expect(value(el, 'budgetLineId')).toBe(LINE);
  });

  it('ne remplace jamais une saisie et ignore un poste absent de la liste', () => {
    const el = form({ amount: '30000', partyName: 'Awa' });
    prefillExpense(el, { ...prefill, budgetLineId: '99999999-9999-4999-8999-999999999999' });
    expect(value(el, 'amount')).toBe('30000');
    expect(value(el, 'partyName')).toBe('Awa');
    expect(value(el, 'budgetLineId')).toBe('');
  });

  it('remplace la date du jour proposée par défaut, mais pas une date modifiée', () => {
    const el = form({ occurredOn: '2026-10-28' });
    prefillExpense(el, prefill);
    expect(value(el, 'occurredOn')).toBe('2026-10-20');
    const edited = form({ occurredOn: '2026-10-28' });
    (edited.elements.namedItem('occurredOn') as HTMLInputElement).value = '2026-10-25';
    prefillExpense(edited, prefill);
    expect(value(edited, 'occurredOn')).toBe('2026-10-25');
  });

  it('laisse vide un champ non lu et tolère un formulaire absent', () => {
    const el = form();
    prefillExpense(el, { amount: null, occurredOn: null, partyName: null, budgetLineId: null });
    expect(value(el, 'amount')).toBe('');
    expect(() => prefillExpense(null, prefill)).not.toThrow();
  });
});
