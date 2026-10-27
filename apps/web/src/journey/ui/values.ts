import {
  isSkipped,
  type ListItem,
  type ListQuestion,
  type PlaceValue,
  type Question,
} from '../types';

/** Valeur manipulée par un champ de saisie, avant validation par le serveur. */
export type EditableValue = string | PlaceValue | ListItem[];

const isPlace = (v: unknown): v is PlaceValue =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Record<string, unknown>).city === 'string' &&
  typeof (v as Record<string, unknown>).countryCode === 'string';

export function emptyItem(question: ListQuestion): ListItem {
  return Object.fromEntries(
    question.fields.map((field) => [field.name, field.kind === 'boolean' ? false : '']),
  );
}

/** Ne garde d'un élément enregistré que les champs de la question, complétés par des champs vides. */
function normalizeItem(question: ListQuestion, stored: unknown): ListItem {
  const source = typeof stored === 'object' && stored !== null ? (stored as ListItem) : {};
  const item = emptyItem(question);
  for (const field of question.fields) {
    const v = source[field.name];
    if (field.kind === 'boolean') item[field.name] = v === true;
    else if (typeof v === 'string') item[field.name] = v;
  }
  return item;
}

/** Valeur de départ : la réponse enregistrée, sinon un champ vide (aussi pour « passée »). */
export function toEditable(
  question: Question,
  stored: unknown,
  defaultCountry: string,
): EditableValue {
  const known = stored !== undefined && !isSkipped(stored);
  switch (question.kind) {
    case 'place':
      return known && isPlace(stored) ? stored : { city: '', countryCode: defaultCountry };
    case 'list':
      return known && Array.isArray(stored) && stored.length > 0
        ? stored.map((item) => normalizeItem(question, item))
        : [emptyItem(question)];
    case 'choice':
      // WHY: une option retirée du registre depuis l'enregistrement ne doit pas être renvoyée.
      return known && typeof stored === 'string' && question.options.includes(stored) ? stored : '';
    default:
      return known && typeof stored === 'string' ? stored : '';
  }
}

const itemIsBlank = (item: ListItem) =>
  Object.values(item).every((v) => typeof v !== 'string' || v.trim() === '');

/** Vrai si rien n'a été saisi : « Suivant » demande alors une réponse ou « Passer ». */
export function isBlank(value: EditableValue): boolean {
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.every(itemIsBlank);
  return value.city.trim() === '';
}

/** Valeur envoyée au serveur : les éléments de liste laissés vides sont retirés. */
export function compact(value: EditableValue): EditableValue {
  return Array.isArray(value) ? value.filter((item) => !itemIsBlank(item)) : value;
}

/** Positions (dans la liste saisie) des éléments conservés par `compact`. */
export function keptIndices(value: EditableValue): number[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, i) => (itemIsBlank(item) ? [] : [i]));
}

/** Champs obligatoires laissés vides dans les éléments non vides, au format `<index>.<nom>`. */
export function missingRequired(question: ListQuestion, items: ListItem[]): string[] {
  return items.flatMap((item, i) =>
    itemIsBlank(item)
      ? []
      : question.fields
          .filter((f) => f.kind !== 'boolean' && f.required)
          .filter((f) => {
            const v = item[f.name];
            return typeof v !== 'string' || v.trim() === '';
          })
          .map((f) => `${i}.${f.name}`),
  );
}

/** Identifiant DOM d'un champ d'élément de liste ; le tout premier porte l'identifiant de l'écran. */
export function listFieldId(
  base: string,
  question: ListQuestion,
  index: number,
  name: string,
): string {
  return index === 0 && question.fields[0]?.name === name ? base : `${base}-${index}-${name}`;
}
