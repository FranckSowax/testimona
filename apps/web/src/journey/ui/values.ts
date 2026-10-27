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
  typeof v === 'object' && v !== null && 'city' in v && 'countryCode' in v;

export function emptyItem(question: ListQuestion): ListItem {
  return Object.fromEntries(
    question.fields.map((field) => [field.name, field.kind === 'boolean' ? false : '']),
  );
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
      return known && Array.isArray(stored) ? (stored as ListItem[]) : [emptyItem(question)];
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
