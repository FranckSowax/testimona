import type { ReceiptPrefill } from '../schema';

/**
 * Propose dans le formulaire de dépense ce que l'IA a lu sur le reçu.
 * WHY: un champ déjà saisi n'est jamais remplacé ; le trésorier reste maître de la saisie et
 * valide toujours. Un poste absent de la liste n'est pas choisi.
 *
 * @example
 * prefillExpense(formRef.current, { amount: 45_000, occurredOn: null, partyName: 'Mba', budgetLineId: null });
 */
export function prefillExpense(form: HTMLFormElement | null, prefill: ReceiptPrefill): void {
  if (!form) return;
  const set = (name: string, value: string | null) => {
    if (value === null) return;
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    if (el.value.trim() !== '') return;
    if (el instanceof HTMLSelectElement && ![...el.options].some((o) => o.value === value)) return;
    el.value = value;
  };
  set('amount', prefill.amount === null ? null : String(prefill.amount));
  set('occurredOn', prefill.occurredOn);
  set('partyName', prefill.partyName);
  set('budgetLineId', prefill.budgetLineId);
}
