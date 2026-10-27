import type { DossierRole } from './schema';

const RANK: Record<DossierRole, number> = {
  owner: 50,
  coordinator: 40,
  treasurer: 30,
  contributor: 20,
  viewer: 10,
};

/** Même règle que `public.dossier_role_rank()` en base. */
export function hasRole(role: DossierRole | null | undefined, min: DossierRole): boolean {
  return role != null && RANK[role] >= RANK[min];
}

export const canManageMembers = (role: DossierRole | null | undefined) =>
  hasRole(role, 'coordinator');
export const canWrite = (role: DossierRole | null | undefined) => hasRole(role, 'contributor');
