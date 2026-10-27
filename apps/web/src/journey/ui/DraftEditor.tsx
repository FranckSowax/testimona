'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { saveDraftAction, type DraftState } from '@/modules/dossier/answers/actions';
import { DRAFT_MAX, type DraftKind } from '../types';
import { FIELD_CLASS } from './field';
import { shareHref } from './share';
import { specificMessage } from './specific-error';

interface Props {
  dossierId: string;
  stepId: string;
  kind: DraftKind;
  /** Texte de départ : le brouillon enregistré, sinon le modèle. */
  initialText: string;
  /** Texte du modèle, pour « Repartir des réponses ». */
  generatedText: string;
  /** Vrai si `initialText` est déjà enregistré. */
  initiallySaved: boolean;
  /** Objet de l'e-mail (annonce par e-mail seulement). */
  subject: string | null;
  readOnly: boolean;
}

const SHELL =
  'bg-secondary text-secondary-foreground mx-auto flex max-w-2xl flex-col gap-5 rounded-3xl p-6 sm:p-10';
const BUTTON =
  'rounded-full border border-white/40 px-4 py-2 text-sm font-semibold disabled:opacity-60';

/**
 * Éditeur d'un brouillon d'annonce : modifier, enregistrer, copier, partager sur WhatsApp ou
 * ouvrir dans la messagerie. Les lecteurs peuvent lire et copier.
 *
 * @example
 * <DraftEditor dossierId={id} stepId="immediate-message" kind="whatsapp" … />
 */
export function DraftEditor(props: Props) {
  const { dossierId, stepId, kind, readOnly } = props;
  const t = useTranslations('journey.draft');
  const tJourney = useTranslations('journey');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<DraftState | null, FormData>(
    saveDraftAction,
    null,
  );
  const [text, setText] = useState(props.initialText);
  const [savedText, setSavedText] = useState(props.initiallySaved ? props.initialText : null);
  // WHY: `seq` change à chaque annonce (clé du <p>), ce qui fait relire « Copié. » deux fois.
  const [status, setStatus] = useState<{ text: string; seq: number } | null>(null);
  const [error, setError] = useState<{ text: string; seq: number } | null>(null);
  const submittedRef = useRef<string>(props.initialText);
  // WHY: sans mémoire du dernier `state` traité, un re-rendu ré-afficherait une erreur effacée.
  const handledRef = useRef<DraftState | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const announce = (message: string) =>
    setStatus((prev) => ({ text: message, seq: (prev?.seq ?? 0) + 1 }));

  useEffect(() => {
    if (state === handledRef.current) return;
    handledRef.current = state;
    if (state?.saved) {
      // WHY: le texte enregistré est celui envoyé à la soumission (et nettoyé par le serveur),
      // pas celui tapé depuis.
      const sent = submittedRef.current;
      const trimmed = sent.trim();
      setSavedText(trimmed);
      setText((current) => (current === sent ? trimmed : current));
      setError(null);
      setStatus((prev) => ({ text: t('saved'), seq: (prev?.seq ?? 0) + 1 }));
    } else if (state?.error) {
      const specific = specificMessage(state.fieldErrors);
      const message = specific ? tJourney(specific) : tErrors(state.error);
      setStatus(null);
      setError((prev) => ({ text: message, seq: (prev?.seq ?? 0) + 1 }));
    }
  }, [state, t, tJourney, tErrors]);

  useEffect(() => {
    if (error) textareaRef.current?.focus();
  }, [error]);

  const copy = async (value: string, field: HTMLTextAreaElement | HTMLInputElement | null) => {
    setError(null);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      announce(t('copied'));
    } catch {
      // WHY: sans API presse-papiers (HTTP, vieux navigateur), on sélectionne le texte.
      field?.focus();
      field?.setSelectionRange(0, field.value.length);
      announce(t('copyManual'));
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // WHY: Entrée dans le champ objet (lecture seule) soumettrait le formulaire malgré l'absence
    // du bouton Enregistrer.
    if (readOnly) return;
    submittedRef.current = text;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const dirty = savedText !== text;
  const href = shareHref(kind, text, props.subject);
  const statusText = status?.text ?? (dirty && !readOnly ? t('unsaved') : '');

  return (
    <form onSubmit={onSubmit} noValidate className={SHELL}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="stepId" value={stepId} />
      <h1 className="font-display text-2xl font-bold">{t(`title.${kind}`)}</h1>
      <p className="text-sm text-white/70">{readOnly ? t('readOnly') : t(`intro.${kind}`)}</p>

      {props.subject && (
        <label className="block space-y-1">
          <span className="text-sm">{t('subject')}</span>
          <input
            ref={subjectRef}
            type="text"
            value={props.subject}
            readOnly
            data-readonly
            className={FIELD_CLASS}
          />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm">{t('body')}</span>
        <textarea
          ref={textareaRef}
          name="text"
          rows={kind === 'email' ? 16 : 10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
            setError(null);
          }}
          readOnly={readOnly}
          data-readonly={readOnly}
          maxLength={DRAFT_MAX}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'draft-error' : 'draft-status'}
          className={FIELD_CLASS}
        />
      </label>

      {error && (
        <p
          key={error.seq}
          id="draft-error"
          role="alert"
          className="text-accent-soft text-sm font-semibold"
        >
          {error.text}
        </p>
      )}
      <p id="draft-status" role="status" className="min-h-5 text-sm text-white/80">
        {statusText}
        {/* WHY: un texte identique n'est pas ré-annoncé ; un caractère invisible alterné le force. */}
        {status && status.seq % 2 === 0 ? '\u200B' : ''}
      </p>

      <div className="flex flex-wrap gap-3">
        {!readOnly && (
          <button
            type="submit"
            disabled={pending || !dirty}
            className="bg-accent rounded-full px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {t('save')}
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(text, textareaRef.current)}
          aria-describedby={href ? undefined : 'draft-too-long'}
          className={BUTTON}
        >
          {t('copy')}
        </button>
        {props.subject && (
          <button
            type="button"
            onClick={() => copy(props.subject ?? '', subjectRef.current)}
            className={BUTTON}
          >
            {t('copySubject')}
          </button>
        )}
        {href && kind === 'whatsapp' && (
          <a href={href} target="_blank" rel="noopener noreferrer" className={BUTTON}>
            {t('shareWhatsapp')} <span className="sr-only">{t('newTab')}</span>
          </a>
        )}
        {href && kind === 'email' && (
          <a href={href} className={BUTTON}>
            {t('openMail')}
          </a>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setText(props.generatedText);
              setStatus(null);
              setError(null);
            }}
            disabled={text === props.generatedText}
            className={BUTTON}
          >
            {t('regenerate')}
          </button>
        )}
      </div>

      {!href && (
        <p id="draft-too-long" className="text-sm text-white/80">
          {t('tooLongForLink')}
        </p>
      )}

      <div className="flex flex-wrap justify-between gap-3 text-sm text-white/70">
        <Link href={`/dossier/${dossierId}/etape/${stepId}?q=0`} className="hover:underline">
          ← {t('editAnswers')}
        </Link>
        <Link href={`/dossier/${dossierId}`} className="hover:underline">
          {t('backToDossier')}
        </Link>
      </div>
    </form>
  );
}
