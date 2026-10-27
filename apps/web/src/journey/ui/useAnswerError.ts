import { useEffect, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import type { AnswerState } from '@/modules/dossier/answers/actions';
import type { Question } from '../types';
import { listFieldId } from './values';

/** Erreur affichée : `seq` change à chaque apparition, même pour un texte identique. */
export interface AnswerError {
  text: string;
  seq: number;
  /** Identifiants DOM des champs de liste fautifs. */
  invalidIds: readonly string[];
}

/** Clés `<index>.<nom>` des champs de liste → identifiants DOM (vide hors des listes). */
function toIds(question: Question, base: string, keys: readonly string[]): string[] {
  if (question.kind !== 'list') return [];
  return keys.map((key) => {
    const [index = '', ...name] = key.split('.');
    return listFieldId(base, question, Number(index), name.join('.'));
  });
}

/**
 * Erreur de l'écran question : issue du serveur (`state`) ou du contrôle côté client (`show`).
 * WHY: `seq` fait rejouer l'annonce (clé du `<p role="alert">`) et le focus à chaque erreur ;
 * `clear` retire une erreur périmée dès la frappe suivante.
 * `keptRef` donne, au moment de l'envoi, la position d'origine des éléments de liste conservés,
 * car le serveur numérote les éléments après retrait des éléments vides.
 */
export function useAnswerError(
  state: AnswerState | null,
  question: Question,
  fieldId: string,
  keptRef: RefObject<number[]>,
) {
  const tErrors = useTranslations('dossier.errors');
  const [error, setError] = useState<AnswerError | null>(null);

  const show = (text: string, invalidKeys: readonly string[] = []) =>
    setError((prev) => ({
      text,
      seq: (prev?.seq ?? 0) + 1,
      invalidIds: toIds(question, fieldId, invalidKeys),
    }));

  useEffect(() => {
    if (!state?.error) return;
    const keys = Object.keys(state.fieldErrors ?? {}).flatMap((key) => {
      const [index = ''] = key.split('.');
      const original = keptRef.current[Number(index)];
      return /^\d+\./.test(key) && original !== undefined
        ? [`${original}${key.slice(index.length)}`]
        : [];
    });
    const text = tErrors(state.error);
    setError((prev) => ({
      text,
      seq: (prev?.seq ?? 0) + 1,
      invalidIds: toIds(question, fieldId, keys),
    }));
  }, [state, tErrors, question, fieldId, keptRef]);

  useEffect(() => {
    if (!error) return;
    document.getElementById(error.invalidIds[0] ?? fieldId)?.focus();
  }, [error, fieldId]);

  return { error, show, clear: () => setError(null) };
}
