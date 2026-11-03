import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('sources de la route de téléchargement des documents', () => {
  // WHY: le document est produit avec le client de l'utilisateur (RLS) ; aucun import du client
  // service-role ni du dossier `server/privileged` n'est admis.
  it.each([
    join(__dirname, 'http.ts'),
    join(__dirname, '../../app/api/dossiers/[dossierId]/documents/[doc]/route.ts'),
  ])('n’importe ni client admin ni module privilégié : %s', (file) => {
    const source = readFileSync(file, 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.filter((path) => /admin|privileged/i.test(path))).toEqual([]);
    expect(source).not.toMatch(/getSupabaseAdminClient/);
  });
});
