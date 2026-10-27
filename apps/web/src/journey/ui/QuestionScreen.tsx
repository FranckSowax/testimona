'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { saveAnswerAction, type AnswerState } from '@/modules/dossier/answers/actions';
import type { Question } from '../types';
import { AnswerInput } from './AnswerInput';
import type { Country } from './inputs/PlaceInput';
import { compact, isBlank, toEditable, type EditableValue } from './values';

interface Props {
  dossierId: string;
  question: Question;
  index: number;
  total: number;
  title: string;
  hint: string;
  stored: unknown;
  readOnly: boolean;
  countries: Country[];
  backHref: string;
  nextHref: string | null;
}

const SHELL =
  'bg-secondary text-secondary-foreground mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6 rounded-3xl p-6 sm:p-10';
const LINK_CLASS = 'text-sm text-white/70 underline-offset-4 hover:underline';

/**
 * Écran d'une question, plein écran : Revenir, Passer, Suivant.
 * La réponse est enregistrée au passage à la question suivante (Suivant ou Passer).
 *
 * @example
 * <QuestionScreen key={question.key} dossierId={id} question={question} index={0} total={6} … />
 */
export function QuestionScreen(props: Props) {
  const { dossierId, question, index, total, readOnly } = props;
  const t = useTranslations('journey.ui');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<AnswerState | null, FormData>(
    saveAnswerAction,
    null,
  );
  const [value, setValue] = useState<EditableValue>(() =>
    toEditable(question, props.stored, props.countries[0]?.code ?? ''),
  );
  const [blank, setBlank] = useState(false);
  const fieldId = `answer-${question.key.replace(/\./g, '-')}`;
  const errorText = blank ? t('required') : state?.error ? tErrors(state.error) : null;

  // WHY: le focus revient au champ une fois l'erreur rendue, pour qu'elle soit annoncée avec lui.
  useEffect(() => {
    if (errorText) document.getElementById(fieldId)?.focus();
  }, [errorText, fieldId]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    if (data.get('intent') !== 'skip') {
      if (isBlank(value)) return setBlank(true);
      data.set('value', JSON.stringify(compact(value)));
    }
    startTransition(() => formAction(data));
  };

  const describedBy =
    [props.hint ? 'question-hint' : null, errorText ? 'question-error' : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const backLink = (
    <Link href={props.backHref} className={LINK_CLASS}>
      ← {index > 0 ? t('back') : t('backToDossier')}
    </Link>
  );

  const body = (
    <>
      <p className="text-sm text-white/60">{t('progress', { current: index + 1, total })}</p>
      <div className="space-y-2">
        <h1 id="question-title" className="font-display text-2xl font-bold">
          {props.title}
        </h1>
        {props.hint && (
          <p id="question-hint" className="text-sm text-white/70">
            {props.hint}
          </p>
        )}
      </div>
      {readOnly && <p className="text-sm text-white/70">{t('readOnly')}</p>}
      <AnswerInput
        id={fieldId}
        question={question}
        value={value}
        onChange={(next) => {
          setValue(next);
          setBlank(false);
        }}
        readOnly={readOnly}
        invalid={errorText !== null}
        labelledBy="question-title"
        describedBy={describedBy}
        countries={props.countries}
      />
      {errorText && (
        <p id="question-error" role="alert" className="text-accent-soft text-sm">
          {errorText}
        </p>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div className={SHELL}>
        {body}
        <div className="mt-auto flex items-center justify-between gap-3">
          {backLink}
          {props.nextHref && (
            <Link href={props.nextHref} className={LINK_CLASS}>
              {t('next')} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={SHELL}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="key" value={question.key} />
      {body}
      <div className="mt-auto flex items-center justify-between gap-3">
        {backLink}
        {/* WHY: « Suivant » est premier dans le DOM pour être le bouton par défaut de la touche
            Entrée ; flex-row-reverse le place visuellement à droite de « Passer ». */}
        <div className="flex flex-row-reverse items-center gap-4">
          <button
            type="submit"
            name="intent"
            value="next"
            disabled={pending}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {index + 1 < total ? t('next') : t('finish')}
          </button>
          <button
            type="submit"
            name="intent"
            value="skip"
            disabled={pending}
            className="text-sm text-white/80 underline disabled:opacity-60"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </form>
  );
}
