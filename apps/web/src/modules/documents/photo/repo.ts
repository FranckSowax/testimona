import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import { isMissingObject, storageFail } from '@/lib/supabase/storage-errors';
import type { RepoResult } from '@/modules/dossier/repo';
import { PHOTO_BUCKET, PHOTO_MAX_BYTES } from './schema';

/** Durée de vie d'un lien de lecture signé, en secondes (5 minutes). */
export const PHOTO_READ_URL_TTL_SECONDS = 300;

/** Photo du dossier telle que lue en base. */
export interface DossierPhoto {
  id: string;
  dossierId: string;
  path: string;
}

const COLUMNS = 'id, dossier_id, path';

interface PhotoRow {
  id: string;
  dossier_id: string;
  path: string;
}

const toPhoto = (r: PhotoRow): DossierPhoto => ({
  id: r.id,
  dossierId: r.dossier_id,
  path: r.path,
});

// WHY: copie de `fail` de modules/budget/receipts/repo.ts (seul le message par défaut change) ;
// trop court pour un module partagé.
function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'dossier photo error' },
  };
}

/**
 * Prépare une photo du dossier (coordinateur et plus, vérifié par la base).
 * WHY: chemin, auteur, dates et absence d'activation sont imposés par le trigger
 * `dossier_photo_before_insert` (qui remplit `path`, NOT NULL, avant le contrôle) ; on n'envoie
 * que le dossier, comme pour les reçus.
 */
export async function insertPhoto(dossierId: string): Promise<RepoResult<DossierPhoto>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_photo')
    .insert({ dossier_id: dossierId })
    .select(COLUMNS)
    .single<PhotoRow>();
  if (error) return fail(error);
  return { data: toPhoto(data), error: null };
}

/**
 * Lien d'envoi signé pour le chemin d'une photo préparée (policy d'insertion du bucket).
 * WHY: jamais `upsert: true` : remplacer le fichier d'une photo, surtout après son activation,
 * doit rester impossible. Supabase fixe la durée du lien (2 heures).
 */
export async function createPhotoUploadUrl(
  path: string,
): Promise<RepoResult<{ path: string; token: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error) return storageFail(error);
  return { data: { path: data.path, token: data.token }, error: null };
}

/**
 * Désigne une photo envoyée comme photo courante du dossier ; l'ancienne est archivée.
 * Codes : 42501 (rôle ou identifiant inconnu), TL012 (déjà utilisée), TL006 (fichier absent).
 */
export async function setCurrentPhoto(photoId: string): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.rpc('set_dossier_photo', { p_photo_id: photoId });
  if (error) return fail(error);
  return { data: true, error: null };
}

/**
 * Dossier d'une photo visible de l'utilisateur (RLS : le coordinateur et plus voient les photos
 * préparées), ou null.
 */
export async function getPhotoDossierId(photoId: string): Promise<RepoResult<string | null>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_photo')
    .select('dossier_id')
    .eq('id', photoId)
    .maybeSingle<{ dossier_id: string }>();
  if (error) return fail(error);
  return { data: data?.dossier_id ?? null, error: null };
}

/** Photo courante du dossier visible de l'utilisateur (RLS), ou null. */
export async function getCurrentPhoto(dossierId: string): Promise<RepoResult<DossierPhoto | null>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_photo')
    .select(COLUMNS)
    .eq('dossier_id', dossierId)
    .not('activated_at', 'is', null)
    .is('archived_at', null)
    .maybeSingle<PhotoRow>();
  // WHY: pas de journal ici : le service journalise déjà les codes (comme les reçus).
  if (error) return fail(error);
  return { data: data ? toPhoto(data) : null, error: null };
}

/** Octets d'une photo visible de l'utilisateur. */
export async function downloadPhoto(path: string): Promise<RepoResult<Uint8Array>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage.from(PHOTO_BUCKET).download(path);
  if (error) return storageFail(error);
  // WHY: la vraie borne est la limite de 5 Mo du bucket ; ce contrôle évite seulement une seconde
  // copie en mémoire au-delà (même raisonnement que `downloadReceipt`).
  if (data.size > PHOTO_MAX_BYTES) {
    return { data: null, error: { code: 'photo_too_large', message: 'photo too large' } };
  }
  return { data: new Uint8Array(await data.arrayBuffer()), error: null };
}

/** Lien de lecture signé de 5 minutes pour une photo visible de l'utilisateur. */
export async function createPhotoReadUrl(path: string): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, PHOTO_READ_URL_TTL_SECONDS);
  if (error && isMissingObject(error)) {
    return { data: null, error: { code: 'object_missing', message: 'object not found' } };
  }
  if (error) return storageFail(error);
  return { data: data.signedUrl, error: null };
}
