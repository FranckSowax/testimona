'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { shareHref } from '@/journey/ui/share';

interface Props {
  /** Texte de synthèse construit côté serveur (totaux seulement). */
  text: string;
}

/**
 * Texte de bilan à partager : copie, partage du téléphone (Web Share) et WhatsApp.
 *
 * @example
 * <ShareSummary text={summaryText(input, t, money)} />
 */
export function ShareSummary({ text }: Props) {
  const t = useTranslations('closing.share');
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [canShare, setCanShare] = useState(false);
  const [status, setStatus] = useState('');
  const titleId = useId();
  const fieldId = useId();
  const hintId = useId();

  // WHY: détecté après le montage, pour que le rendu serveur et le premier rendu client soient
  // identiques (Web Share n'existe que dans certains navigateurs, surtout sur téléphone).
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus(t('copied'));
    } catch {
      // WHY: sans presse-papiers (HTTP, ancien navigateur), on sélectionne le texte.
      fieldRef.current?.focus();
      fieldRef.current?.select();
      setStatus(t('copyManual'));
    }
  };

  const share = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // WHY: fermer la feuille de partage lève une erreur (AbortError) : rien à signaler.
    }
  };

  const whatsapp = shareHref('whatsapp', text, null);
  return (
    <section aria-labelledby={titleId} className="border-border space-y-3 rounded-2xl border p-4">
      <h2 id={titleId} className="font-display text-foreground text-lg font-semibold">
        {t('title')}
      </h2>
      <p id={hintId} className="text-foreground text-sm">
        {t('hint')}
      </p>
      <label htmlFor={fieldId} className="text-foreground block text-sm font-semibold">
        {t('label')}
      </label>
      <textarea
        ref={fieldRef}
        id={fieldId}
        readOnly
        value={text}
        rows={text.split('\n').length}
        aria-describedby={hintId}
        className="border-border text-foreground w-full rounded-xl border bg-transparent p-3 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className={buttonClasses({ variant: 'secondary', size: 'sm' })}
        >
          {t('copy')}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={share}
            className={buttonClasses({ variant: 'secondary', styleVariant: 'outline', size: 'sm' })}
          >
            {t('share')}
          </button>
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('whatsappLabel')}
            className="text-secondary text-sm font-semibold underline underline-offset-2"
          >
            {t('whatsapp')}
          </a>
        )}
      </div>
      <p role="status" className="text-foreground text-sm">
        {status}
      </p>
    </section>
  );
}
