'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { shrinkImage } from '@/modules/budget/receipts/ui/shrinkImage';
import { preparePhotoAction, setDossierPhotoAction } from '../actions';
import { PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_TYPE } from '../schema';
import { photoErrorText, type PhotoCaptureError } from './photoError';

/** Pause avant l'unique nouvelle tentative quand le fichier n'est pas encore au stockage. */
export const PHOTO_RETRY_DELAY_MS = 1500;

interface Props {
  dossierId: string;
  /** Vrai pour le coordinateur et plus ; les autres membres voient la photo sans bouton. */
  canEdit: boolean;
  /** Pause avant la nouvelle tentative (remplaçable dans les tests). */
  retryDelayMs?: number;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'error'; text: string };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Choix de la photo du défunt pour le livret et l'affiche : réencodage JPEG dans le navigateur,
 * envoi direct au stockage par un lien signé préparé par le serveur, puis désignation comme photo
 * du dossier. La vignette elle-même est affichée par la synthèse.
 * WHY: `accept="image/*"` : le téléphone propose l'appareil photo ou la galerie, et le
 * réencodage (`shrinkImage`) ramène tout format décodable à un JPEG sans métadonnées.
 *
 * @example
 * <PhotoCapture dossierId={id} canEdit={hasRole(role, 'coordinator')} />
 */
export function PhotoCapture({ dossierId, canEdit, retryDelayMs = PHOTO_RETRY_DELAY_MS }: Props) {
  const t = useTranslations('documents.photo');
  const tRoot = useTranslations();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // WHY: verrou synchrone ; deux choix rapprochés ne préparent jamais deux photos.
  const busyRef = useRef(false);
  // WHY: démonté en cours d'envoi, le composant ne poursuit pas et ne touche plus à son état.
  const alive = useRef(true);
  const id = useId();
  const hintId = `${id}-hint`;
  const busy = status.kind === 'busy';
  const fail = (error: PhotoCaptureError) =>
    setStatus({ kind: 'error', text: photoErrorText(error, tRoot) });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const designate = async (photoId: string) => {
    const first = await setDossierPhotoAction({ dossierId, photoId });
    if (first.ok || first.error !== 'photo_missing') return first;
    // WHY: le stockage peut signaler la fin de l'envoi un instant avant que la base voie
    // l'objet (TL006, retentable) : une seule nouvelle tentative après une courte pause.
    await pause(retryDelayMs);
    if (!alive.current) return first;
    return setDossierPhotoAction({ dossierId, photoId });
  };

  const handleFile = async (file: File) => {
    setStatus({ kind: 'busy', text: t('uploading') });
    const photo = await shrinkImage(file);
    if (!alive.current) return;
    // WHY: `shrinkImage` rend l'original quand le réencodage échoue ; seul un JPEG part.
    if (photo.type !== PHOTO_TYPE || photo.size < 1) return fail('unreadable');
    if (photo.size > PHOTO_MAX_BYTES) return fail('photo_size');
    const prepared = await preparePhotoAction({
      dossierId,
      mimeType: photo.type,
      sizeBytes: photo.size,
    });
    if (!alive.current) return;
    if (!prepared.ok) return fail(prepared.error);
    const { error } = await getSupabaseBrowser()
      .storage.from(PHOTO_BUCKET)
      .uploadToSignedUrl(prepared.data.path, prepared.data.token, photo, {
        contentType: PHOTO_TYPE,
      });
    if (!alive.current) return;
    if (error) return fail('upload_failed');
    const set = await designate(prepared.data.photoId);
    if (!alive.current) return;
    if (!set.ok) return fail(set.error);
    setStatus({ kind: 'info', text: t('saved') });
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // WHY: vidé pour que la même photo, choisie de nouveau après un échec, relance l'envoi.
    e.target.value = '';
    if (busyRef.current) return;
    if (!file) return setStatus({ kind: 'idle' });
    busyRef.current = true;
    handleFile(file)
      // WHY: une action serveur ou le réseau peuvent lever ; les documents restent possibles.
      .catch(() => {
        if (alive.current) fail('upload_failed');
      })
      .finally(() => {
        busyRef.current = false;
      });
  };

  if (!canEdit) return null;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-foreground block text-sm">
        {t('label')}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        // WHY: `aria-disabled` plutôt que `disabled` pendant l'envoi : le champ garde le focus ;
        // `busyRef` écarte déjà un second choix.
        aria-disabled={busy || undefined}
        aria-describedby={hintId}
        aria-busy={busy || undefined}
        onClick={(e) => {
          if (busyRef.current) e.preventDefault();
        }}
        onChange={onChange}
        className="text-foreground block w-full text-sm aria-disabled:opacity-60"
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
