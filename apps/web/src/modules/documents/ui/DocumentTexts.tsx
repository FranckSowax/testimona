'use client';

import { useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { specificMessage } from '@/journey/ui/specific-error';
import { generateDocumentTextsAction } from '@/modules/ai/actions';
import type { AiError } from '@/modules/ai/types';
import { saveDocumentTextAction } from '../actions';
import { DOCUMENT_TEXT_KINDS, DOCUMENT_TEXT_MAX, type DocumentTextKind } from '../texts';

type Texts = Record<DocumentTextKind, string>;
type Notice = { text: string; error: boolean; seq: number } | null;
/** Message de l'IA ; `facts` ajoute le lien pour compléter le prénom ou la biographie. */
type AiNotice = { text: string; error: boolean; facts: boolean; seq: number } | null;

interface Props {
  dossierId: string;
  /** Texte enregistré (ou null) et texte de départ de chaque type. */
  texts: Record<DocumentTextKind, { saved: string | null; starter: string }>;
  /** Contributeur et plus ; sinon lecture seule, sans IA ni enregistrement. */
  canEdit: boolean;
  /** Vrai quand l'IA est configurée côté serveur. */
  aiEnabled: boolean;
  /** Où compléter le prénom ou la biographie quand l'IA manque de faits. */
  factsHref: string;
}

const FIELD =
  'border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 aria-[invalid=true]:border-red-600 read-only:opacity-80';
const BUTTON =
  'border-border text-foreground rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60';
const STATUS = 'text-muted-foreground text-sm empty:hidden';
const ALERT = 'text-sm font-semibold text-red-700 empty:hidden';

/** Identifiant du champ d'un texte, cible des liens « Écrire ce texte » de la synthèse. */
export function documentTextId(kind: DocumentTextKind): string {
  return `documents-text-${kind}`;
}

function mapKinds<T>(fn: (kind: DocumentTextKind) => T): Record<DocumentTextKind, T> {
  return Object.fromEntries(DOCUMENT_TEXT_KINDS.map((kind) => [kind, fn(kind)])) as Record<
    DocumentTextKind,
    T
  >;
}

// WHY: même nettoyage que `documentTextSchema` côté serveur, pour savoir ce qui a été enregistré.
const normalize = (text: string) => text.replace(/\r\n?/g, '\n').trim();

/**
 * Les trois textes du livret (couverture, hommage, remerciements) : relire, modifier,
 * enregistrer chacun, ou demander une proposition à l'IA (jamais enregistrée sans clic).
 *
 * @example
 * <DocumentTexts dossierId={id} texts={texts} canEdit aiEnabled />
 */
export function DocumentTexts(props: Props) {
  const { dossierId, texts: initial, canEdit, aiEnabled, factsHref } = props;
  const t = useTranslations('documents.synthesis');
  const tJourney = useTranslations('journey');
  const tAi = useTranslations('documents.synthesis.ai');
  const tErrors = useTranslations('dossier.errors');
  // WHY: un lecteur ne voit que les textes enregistrés ; un texte de départ affiché comme s'il
  // était celui de la famille l'induirait en erreur.
  const [texts, setTexts] = useState<Texts>(() =>
    mapKinds((kind) => initial[kind].saved ?? (canEdit ? initial[kind].starter : '')),
  );
  const [saved, setSaved] = useState(() => mapKinds((kind) => initial[kind].saved));
  const [notices, setNotices] = useState(() => mapKinds<Notice>(() => null));
  const [saving, setSaving] = useState<DocumentTextKind | null>(null);
  const [aiNotice, setAiNotice] = useState<AiNotice>(null);
  const [generating, startGenerating] = useTransition();
  // WHY: verrous synchrones ; un double clic ne lance ni deux appels à l'IA ni deux écritures.
  const generatingRef = useRef(false);
  const savingRef = useRef(false);
  // WHY: textes saisis pendant l'appel à l'IA, pour dire qu'ils ont été gardés.
  const editedRef = useRef(new Set<DocumentTextKind>());

  const notify = (kind: DocumentTextKind, text: string, error: boolean) =>
    setNotices((prev) => ({ ...prev, [kind]: { text, error, seq: (prev[kind]?.seq ?? 0) + 1 } }));
  const notifyAi = (text: string, error: boolean, facts = false) =>
    setAiNotice((prev) => ({ text, error, facts, seq: (prev?.seq ?? 0) + 1 }));

  // WHY: messages propres à la proposition de textes (ceux des annonces parlent
  // d'« amélioration ») ; `validation` signifie ici qu'il manque prénom et biographie.
  const aiFail = (code: AiError) => {
    if (code === 'validation') return notifyAi(tAi('missingFacts'), true, true);
    if (code === 'unavailable' || code === 'quota' || code === 'failed' || code === 'forbidden')
      return notifyAi(tAi(code), true);
    return notifyAi(tErrors(code), true);
  };

  const generate = () => {
    if (generatingRef.current || savingRef.current) return;
    generatingRef.current = true;
    editedRef.current.clear();
    const sent = { ...texts };
    notifyAi(t('generating'), false);
    startGenerating(async () => {
      try {
        const res = await generateDocumentTextsAction({ dossierId });
        if (!res.ok) {
          aiFail(res.error);
          return;
        }
        // WHY: on ne remplace qu'un texte inchangé depuis l'envoi ; la proposition n'est
        // enregistrée qu'au clic sur « Enregistrer », après relecture.
        setTexts((current) =>
          mapKinds((kind) => (current[kind] === sent[kind] ? res.texts[kind] : current[kind])),
        );
        const kept = editedRef.current.size > 0 ? ` ${t('keptEdited')}` : '';
        notifyAi(`${t('generated')}${kept}`, false);
      } catch {
        aiFail('failed');
      } finally {
        generatingRef.current = false;
      }
    });
  };

  const save = async (kind: DocumentTextKind) => {
    if (savingRef.current || generatingRef.current) return;
    savingRef.current = true;
    const sent = texts[kind];
    setSaving(kind);
    try {
      const res = await saveDocumentTextAction({ dossierId, kind, text: sent });
      if (res.ok) {
        // WHY: l'action rafraîchit la synthèse (formats prêts) ; on garde ici le texte nettoyé
        // tel qu'enregistré, sans écraser une saisie faite depuis l'envoi.
        const clean = normalize(sent);
        setSaved((prev) => ({ ...prev, [kind]: clean }));
        setTexts((prev) => (prev[kind] === sent ? { ...prev, [kind]: clean } : prev));
        notify(kind, t('saved'), false);
      } else {
        const specific = specificMessage(res.fieldErrors);
        notify(kind, specific ? tJourney(specific) : tErrors(res.error), true);
      }
    } catch {
      notify(kind, tErrors('unknown'), true);
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="documents-texts-title" className="space-y-5">
      <h2 id="documents-texts-title" className="font-display text-foreground text-lg font-semibold">
        {t('textsTitle')}
      </h2>
      <p className="text-muted-foreground text-sm">{canEdit ? t('textsIntro') : t('readOnly')}</p>

      {canEdit && aiEnabled && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={generate}
            // WHY: pas de `disabled` pendant l'appel (le focus partirait sur body) : le verrou
            // ignore le clic.
            disabled={saving !== null}
            aria-disabled={generating || undefined}
            aria-busy={generating || undefined}
            className={BUTTON}
          >
            {generating ? t('generating') : t('generate')}
          </button>
          {/* WHY: deux régions stables (statut et alerte) : changer le `role` d'un même élément
              n'est pas annoncé de façon fiable par les lecteurs d'écran. */}
          <p role="status" className={STATUS}>
            {aiNotice && !aiNotice.error ? aiNotice.text : ''}
          </p>
          <p role="alert" className={ALERT}>
            {aiNotice?.error ? aiNotice.text : ''}
          </p>
          {aiNotice?.facts && (
            <Link href={factsHref} className="text-primary text-sm font-semibold hover:underline">
              {tAi('missingFactsLink')}
            </Link>
          )}
        </div>
      )}

      {DOCUMENT_TEXT_KINDS.map((kind) => {
        const id = documentTextId(kind);
        const value = texts[kind];
        const max = DOCUMENT_TEXT_MAX[kind];
        const notice = notices[kind];
        const label = t(`text.${kind}`);
        const hint = kind === 'tribute' && canEdit;
        const dirty = canEdit && normalize(value) !== (saved[kind] ?? '');
        const unsaved = dirty && !notice;
        // WHY: un lecteur ne voit pas de champ vide « 0 / 200 » pour un texte jamais écrit.
        if (!canEdit && value === '') {
          return (
            <div key={kind} className="space-y-1">
              <p className="text-foreground font-semibold">{label}</p>
              <p className="text-muted-foreground text-sm">{t('notWritten')}</p>
            </div>
          );
        }
        return (
          <div key={kind} className="space-y-1">
            <label htmlFor={id} className="text-foreground block font-semibold">
              {label}
            </label>
            {hint && (
              <p id={`${id}-hint`} className="text-muted-foreground text-sm">
                {t('tributeHint')}
              </p>
            )}
            <textarea
              id={id}
              rows={kind === 'tribute' ? 10 : kind === 'cover' ? 2 : 5}
              value={value}
              onChange={(e) => {
                const next = e.target.value;
                if (generatingRef.current) editedRef.current.add(kind);
                setTexts((prev) => ({ ...prev, [kind]: next }));
                setNotices((prev) => ({ ...prev, [kind]: null }));
              }}
              readOnly={!canEdit || generating}
              aria-busy={generating || undefined}
              maxLength={max}
              aria-invalid={notice?.error || value.length > max || undefined}
              aria-describedby={`${hint ? `${id}-hint ` : ''}${id}-count ${id}-unsaved ${id}-status ${id}-alert`}
              className={FIELD}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p id={`${id}-count`} className="text-muted-foreground text-xs tabular-nums">
                {t('counter', { count: value.length, max })}
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => save(kind)}
                  disabled={saving !== null || generating || !dirty || value.trim() === ''}
                  aria-label={t('saveLabel', { text: label })}
                  className="bg-accent rounded-full px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving === kind ? t('saving') : t('save')}
                </button>
              )}
            </div>
            {/* WHY: « Pas encore enregistré » est un état, pas un événement : hors région live. */}
            <p id={`${id}-unsaved`} className={STATUS}>
              {unsaved ? t('unsaved') : ''}
            </p>
            <p id={`${id}-status`} role="status" className={STATUS}>
              {notice && !notice.error ? notice.text : ''}
            </p>
            <p id={`${id}-alert`} role="alert" className={ALERT}>
              {notice?.error ? notice.text : ''}
            </p>
          </div>
        );
      })}
    </section>
  );
}
