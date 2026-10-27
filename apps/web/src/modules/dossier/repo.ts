import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { CreateDossierInput, DossierRole, EntryPoint } from './schema';

export interface RepoError {
  code: string;
  message: string;
}
export type RepoResult<T> = { data: T; error: null } | { data: null; error: RepoError };

export interface DossierSummary {
  id: string;
  title: string;
  city: string;
  countryCode: string;
  entryPoint: EntryPoint;
  createdAt: string;
}

export interface PersonSummary {
  firstName: string;
  lastName: string;
  nickname: string | null;
  birthDate: string | null;
  deathDate: string | null;
}

export interface MemberSummary {
  userId: string;
  role: DossierRole;
  displayName: string | null;
}

export interface InvitationSummary {
  id: string;
  role: DossierRole;
  email: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}

interface DossierRow {
  id: string;
  title: string;
  city: string;
  country_code: string;
  entry_point: EntryPoint;
  created_at: string;
}

const DOSSIER_COLUMNS = 'id, title, city, country_code, entry_point, created_at';

function toDossier(r: DossierRow): DossierSummary {
  return {
    id: r.id,
    title: r.title,
    city: r.city,
    countryCode: r.country_code,
    entryPoint: r.entry_point,
    createdAt: r.created_at,
  };
}

function logRead(op: string, error: { code?: string } | null): void {
  if (error) console.error(`[dossier/repo] ${op} impossible`, { code: error.code });
}

type DossierJoinRow = DossierRow & { dossier_member?: unknown };

function stripJoin(row: DossierJoinRow): DossierRow {
  const copy = { ...row };
  delete copy.dossier_member;
  return copy;
}

function fail(error: { code?: string; message?: string } | null, fallback: string): RepoError {
  return { code: error?.code || 'unknown', message: error?.message || fallback };
}

export async function insertDossierWithPerson(
  input: CreateDossierInput,
): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('create_dossier_with_person', {
    p_entry_point: input.entryPoint,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_country_code: input.countryCode,
    p_city: input.city,
    p_relationship: input.relationship,
  });
  if (error || typeof data !== 'string')
    return { data: null, error: fail(error, 'no id returned') };
  return { data, error: null };
}

/**
 * Dossiers dont l'utilisateur est membre.
 * WHY: la policy dossier_select laisse aussi le créateur voir son dossier alors qu'il n'en est
 * plus membre ; on filtre donc explicitement par appartenance (jointure interne sur dossier_member).
 */
export async function listMyDossiers(): Promise<DossierSummary[]> {
  const db = await getSupabaseServer();
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return [];
  const { data, error } = await db
    .from('dossier')
    .select(`${DOSSIER_COLUMNS}, dossier_member!inner(user_id)`)
    .eq('dossier_member.user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<DossierJoinRow[]>();
  logRead('listMyDossiers', error);
  return (data ?? []).map((r) => toDossier(stripJoin(r)));
}

/** Un dossier dont l'utilisateur est membre (même raison que listMyDossiers). */
export async function getDossier(id: string): Promise<DossierSummary | null> {
  const db = await getSupabaseServer();
  const { data: auth } = await db.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  // WHY: voir listMyDossiers, la RLS seule laisse passer un créateur qui n'est plus membre.
  const { data, error } = await db
    .from('dossier')
    .select(`${DOSSIER_COLUMNS}, dossier_member!inner(user_id)`)
    .eq('id', id)
    .eq('dossier_member.user_id', user.id)
    .maybeSingle<DossierJoinRow>();
  logRead('getDossier', error);
  return data ? toDossier(stripJoin(data)) : null;
}

/**
 * Fiche de la personne avec l'erreur de lecture (code seulement journalisé).
 * WHY: l'IA ne doit pas distinguer « pas de fiche » d'une lecture en échec.
 */
export async function getPersonResult(
  dossierId: string,
): Promise<{ data: PersonSummary | null; error: { code: string } | null }> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('person')
    .select('first_name, last_name, nickname, birth_date, death_date')
    .eq('dossier_id', dossierId)
    .maybeSingle<{
      first_name: string;
      last_name: string;
      nickname: string | null;
      birth_date: string | null;
      death_date: string | null;
    }>();
  logRead('getPerson', error);
  const err = error ? { code: error.code || 'unknown' } : null;
  if (!data) return { data: null, error: err };
  return {
    data: {
      firstName: data.first_name,
      lastName: data.last_name,
      nickname: data.nickname,
      birthDate: data.birth_date,
      deathDate: data.death_date,
    },
    error: err,
  };
}

export async function getPerson(dossierId: string): Promise<PersonSummary | null> {
  return (await getPersonResult(dossierId)).data;
}

export async function listMembers(dossierId: string): Promise<MemberSummary[]> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_member')
    .select('user_id, role, display_name')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: true })
    .returns<{ user_id: string; role: DossierRole; display_name: string | null }[]>();
  logRead('listMembers', error);
  return (data ?? []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.display_name,
  }));
}

/** Rôle de l'utilisateur courant dans le dossier, ou null s'il n'en est pas membre. */
export async function getMyRole(dossierId: string): Promise<DossierRole | null> {
  const db = await getSupabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await db
    .from('dossier_member')
    .select('role')
    .eq('dossier_id', dossierId)
    .eq('user_id', auth.user.id)
    .maybeSingle<{ role: DossierRole }>();
  logRead('getMyRole', error);
  return data?.role ?? null;
}

export async function listInvitations(dossierId: string): Promise<InvitationSummary[]> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_invitation')
    .select('id, role, email, created_at, expires_at, used_at')
    .eq('dossier_id', dossierId)
    .order('created_at', { ascending: false })
    .returns<
      {
        id: string;
        role: DossierRole;
        email: string | null;
        created_at: string;
        expires_at: string;
        used_at: string | null;
      }[]
    >();
  logRead('listInvitations', error);
  return (data ?? []).map((i) => ({
    id: i.id,
    role: i.role,
    email: i.email,
    createdAt: i.created_at,
    expiresAt: i.expires_at,
    usedAt: i.used_at,
  }));
}

export async function insertInvitation(args: {
  dossierId: string;
  role: DossierRole;
  email: string | undefined;
  tokenHash: string;
}): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_invitation')
    .insert({
      dossier_id: args.dossierId,
      role: args.role,
      email: args.email ?? null,
      token_hash: args.tokenHash,
    })
    .select('id')
    .single<{ id: string }>();
  if (error || !data) return { data: null, error: fail(error, 'insert failed') };
  return { data: data.id, error: null };
}

export async function deleteInvitation(dossierId: string, id: string): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_invitation')
    .delete()
    .eq('id', id)
    .eq('dossier_id', dossierId)
    .select('id');
  if (error) return { data: null, error: fail(error, 'delete failed') };
  if (!data || data.length === 0) {
    return { data: null, error: { code: 'not_found', message: 'invitation not found' } };
  }
  return { data: true, error: null };
}

export async function acceptInvitationByToken(token: string): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('accept_dossier_invitation', { p_token: token });
  if (error || typeof data !== 'string')
    return { data: null, error: fail(error, 'no id returned') };
  return { data, error: null };
}
