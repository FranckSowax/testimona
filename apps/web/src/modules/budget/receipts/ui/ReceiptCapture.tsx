'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { prepareReceiptUploadAction, readReceiptAction } from '../actions';
import {
  isReceiptType,
  RECEIPT_BUCKET,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  type ReceiptPrefill,
} from '../schema';
import { isManualFallback, receiptErrorText, type CaptureError } from './receiptError';
import { shrinkImage } from './shrinkImage';

interface Props {
  dossierId: string;
  /** Reçu joint à la dépense (son identifiant), ou null quand aucun reçu n'est joint. */
  onAttach: (receiptId: string | null) => void;
  /** Ce que l'IA a lu, à proposer dans le formulaire. */
  onRead: (prefill: ReceiptPrefill) => void;
  /** Vrai pendant l'envoi ou la lecture : le formulaire bloque alors son envoi. */
  onBusyChange?: (busy: boolean) => void;
  /** Bloque le choix d'une photo (formulaire en cours d'envoi ou figé). */
  disabled?: boolean;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string };

/**
 * Photo d'un reçu : contrôle du type, réduction dans le navigateur, contrôle de la taille, envoi
 * direct au stockage par un lien signé préparé par le serveur, puis lecture par l'IA pour
 * préremplir la dépense.
 * WHY: le champ de fichier n'a pas de `name` : la photo ne part jamais avec le formulaire de
 * dépense (seul l'identifiant du reçu y figure). Sans `capture`, le téléphone propose l'appareil
 * photo ou la galerie.
 *
 * @example
 * <ReceiptCapture dossierId={id} onAttach={setReceiptId} onRead={(p) => prefillExpense(form, p)} />
 */
export function ReceiptCapture({
  dossierId,
  onAttach,
  onRead,
  onBusyChange,
  disabled = false,
}: Props) {
  const t = useTranslations('receipts.capture');
  const tRoot = useTranslations();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // WHY: verrou synchrone ; deux choix rapprochés ne lancent jamais deux lectures (quota).
  const busyRef = useRef(false);
  // WHY: démonté en cours d'envoi (formulaire remis à zéro), le composant ne prépare plus rien,
  // ne consomme pas le quota de lecture et ne touche plus au formulaire.
  const alive = useRef(true);
  const notifyBusy = useRef(onBusyChange);
  const id = useId();
  const hintId = `${id}-hint`;
  const busy = status.kind === 'busy';
  const fail = (error: CaptureError) =>
    setStatus({ kind: 'error', text: receiptErrorText(error, tRoot) });

  useEffect(() => {
    notifyBusy.current = onBusyChange;
  }, [onBusyChange]);
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      // WHY: sans cela, le formulaire resterait bloqué par une photo qui n'existe plus.
      if (busyRef.current) notifyBusy.current?.(false);
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!isReceiptType(file.type)) return fail('receipt_type');
    setStatus({ kind: 'busy', text: t('uploading') });
    const photo = await shrinkImage(file);
    if (!alive.current) return;
    if (!isReceiptType(photo.type)) return fail('receipt_type');
    if (photo.size < 1 || photo.size > RECEIPT_MAX_BYTES) return fail('receipt_size');
    const prepared = await prepareReceiptUploadAction({
      dossierId,
      mimeType: photo.type,
      sizeBytes: photo.size,
    });
    if (!alive.current) return;
    if (!prepared.ok) return fail(prepared.error);
    const { error } = await getSupabaseBrowser()
      .storage.from(RECEIPT_BUCKET)
      .uploadToSignedUrl(prepared.data.path, prepared.data.token, photo, {
        contentType: photo.type,
      });
    if (!alive.current) return;
    if (error) return fail('upload_failed');
    onAttach(prepared.data.receiptId);
    setStatus({ kind: 'busy', text: t('reading') });
    const read = await readReceiptAction({ dossierId, receiptId: prepared.data.receiptId }).catch(
      // WHY: la photo est envoyée et jointe ; une lecture qui lève laisse la saisie manuelle.
      () => ({ ok: false, error: 'failed' }) as const,
    );
    if (!alive.current) return;
    if (read.ok) {
      onRead(read.data);
      return setStatus({ kind: 'info', text: t('read') });
    }
    // WHY: l'IA n'a pas lu le reçu, mais la photo est bonne : elle reste jointe.
    if (isManualFallback(read.error)) {
      return setStatus({ kind: 'info', text: receiptErrorText(read.error, tRoot) });
    }
    // WHY: une photo refusée à la lecture (pas une image, trop lourde, droits) n'est pas jointe.
    onAttach(null);
    fail(read.error);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // WHY: vidé pour que la même photo, choisie de nouveau après un échec, relance l'envoi.
    e.target.value = '';
    if (busyRef.current) return;
    onAttach(null);
    if (!file) return setStatus({ kind: 'idle' });
    busyRef.current = true;
    handleFile(file)
      // WHY: une action serveur ou le réseau peuvent lever ; la saisie manuelle reste possible.
      .catch(() => {
        if (alive.current) fail('upload_failed');
      })
      .finally(() => {
        busyRef.current = false;
      });
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-foreground block text-sm">
        {t('label')}
      </label>
      <input
        id={id}
        type="file"
        accept={RECEIPT_TYPES.join(',')}
        // WHY: `aria-disabled` plutôt que `disabled` pendant l'envoi : le champ garde le focus ;
        // `busyRef` écarte déjà un second choix.
        disabled={disabled}
        aria-disabled={busy || undefined}
        aria-describedby={hintId}
        aria-busy={busy || undefined}
        onClick={(e) => {
          if (busyRef.current) e.preventDefault();
        }}
        onChange={onChange}
        className="text-foreground block w-full text-sm disabled:opacity-60 aria-disabled:opacity-60"
      />
      <p id={hintId} className="text-foreground text-sm">
        {t('hint')}
      </p>
      <p role="status" className="text-foreground text-sm">
        {status.kind === 'busy' || status.kind === 'info' ? status.text : ''}
      </p>
      {status.kind === 'error' && (
        <p role="alert" className="text-destructive text-sm">
          {status.text}
        </p>
      )}
    </div>
  );
}
