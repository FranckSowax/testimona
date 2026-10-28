import type { ReceiptPrefill } from '../schema';

/**
 * Propose dans le formulaire de dépense ce que l'IA a lu sur le reçu.
 * WHY: un champ déjà saisi n'est jamais remplacé (la date du jour proposée par défaut ne compte pas
 * comme une saisie) ; le trésorier reste maître de la saisie et
 * valide toujours. Un poste absent de la liste n'est pas choisi.
 *
 * @example
 * prefillExpense(formRef.current, { amount: 45_000, occurredOn: null, partyName: 'Mba', budgetLineId: null });
 */
export function prefillExpense(form: HTMLFormElement | null, prefill: ReceiptPrefill): void {
  if (!form) return;
  const set = (name: string, value: string | null, keepsDefault = false) => {
    if (value === null) return;
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    // WHY: la date porte la date du jour par défaut ; tant qu'on n'y a pas touché, elle compte
    // comme vide et la date lue sur le reçu la remplace.
    const untouched =
      el.value.trim() === '' ||
      (keepsDefault && el instanceof HTMLInputElement && el.value === el.defaultValue);
    if (!untouched) return;
    if (el instanceof HTMLSelectElement && ![...el.options].some((o) => o.value === value)) return;
    el.value = value;
  };
  set('amount', prefill.amount === null ? null : String(prefill.amount));
  set('occurredOn', prefill.occurredOn, true);
  set('partyName', prefill.partyName);
  set('budgetLineId', prefill.budgetLineId);
}
