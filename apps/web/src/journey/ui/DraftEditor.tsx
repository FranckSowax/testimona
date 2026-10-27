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
const FIELD = 'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white';

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
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<DraftState | null, FormData>(
    saveDraftAction,
    null,
  );
  const [text, setText] = useState(props.initialText);
  const [savedText, setSavedText] = useState(props.initiallySaved ? props.initialText : null);
  const [status, setStatus] = useState<string | null>(null);
  const submittedRef = useRef<string>(props.initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // WHY: le texte enregistré est celui envoyé au moment de la soumission, pas celui tapé depuis.
  useEffect(() => {
    if (state?.saved) {
      setSavedText(submittedRef.current);
      setStatus(t('saved'));
    }
  }, [state, t]);

  const copy = async (value: string, select: () => void) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus(t('copied'));
    } catch {
      // WHY: sans API presse-papiers (HTTP, vieux navigateur), on sélectionne le texte.
      select();
      setStatus(t('copyManual'));
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submittedRef.current = text;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const dirty = savedText !== text;
  const encoded = encodeURIComponent(text);
  const message = state?.error
    ? tErrors(state.error)
    : (status ?? (dirty && !readOnly ? t('unsaved') : ''));

  return (
    <form onSubmit={onSubmit} noValidate className={SHELL}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="stepId" value={stepId} />
      <h1 className="font-display text-2xl font-bold">{t(`title.${kind}`)}</h1>
      <p className="text-sm text-white/70">{readOnly ? t('readOnly') : t(`intro.${kind}`)}</p>

      {props.subject && (
        <label className="block space-y-1">
          <span className="text-sm">{t('subject')}</span>
          <input ref={subjectRef} type="text" value={props.subject} readOnly className={FIELD} />
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
          }}
          readOnly={readOnly}
          maxLength={DRAFT_MAX}
          className={FIELD}
        />
      </label>

      <p role="status" className="min-h-5 text-sm text-white/80">
        {message}
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
          onClick={() => copy(text, () => textareaRef.current?.select())}
          className={BUTTON}
        >
          {t('copy')}
        </button>
        {props.subject && (
          <button
            type="button"
            onClick={() => copy(props.subject ?? '', () => subjectRef.current?.select())}
            className={BUTTON}
          >
            {t('copySubject')}
          </button>
        )}
        {kind === 'whatsapp' ? (
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            className={BUTTON}
          >
            {t('shareWhatsapp')}
          </a>
        ) : (
          <a
            href={`mailto:?subject=${encodeURIComponent(props.subject ?? '')}&body=${encoded}`}
            className={BUTTON}
          >
            {t('openMail')}
          </a>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setText(props.generatedText);
              setStatus(null);
            }}
            disabled={text === props.generatedText}
            className={BUTTON}
          >
            {t('regenerate')}
          </button>
        )}
      </div>

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
