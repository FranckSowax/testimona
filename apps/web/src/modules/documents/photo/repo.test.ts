import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase, comme receipts/repo.test.ts. Chaque appel terminal
// (single, maybeSingle, rpc, appels du stockage) consomme la réponse suivante de la file.
const { results, calls } = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => {
  const next = () => Promise.resolve(results.shift());
  const track =
    (method: string, then: () => unknown) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return then();
    };
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'insert', 'eq', 'not', 'is']) {
    chain[method] = track(method, () => chain);
  }
  chain.single = track('single', next);
  chain.maybeSingle = track('maybeSingle', next);
  chain.rpc = track('rpc', next);
  const bucket = {
    createSignedUploadUrl: track('createSignedUploadUrl', next),
    download: track('download', next),
    createSignedUrl: track('createSignedUrl', next),
  };
  chain.storage = { from: track('storage.from', () => bucket) };
  return { getSupabaseServer: async () => chain };
});

const {
  createPhotoReadUrl,
  createPhotoUploadUrl,
  downloadPhoto,
  getCurrentPhoto,
  insertPhoto,
  setCurrentPhoto,
} = await import('./repo');
const { PHOTO_MAX_BYTES } = await import('./schema');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const PHOTO = '99999999-9999-4999-8999-999999999999';
const PATH = `${DOSSIER}/${PHOTO}.jpg`;
const row = { id: PHOTO, dossier_id: DOSSIER, path: PATH };
const photo = { id: PHOTO, dossierId: DOSSIER, path: PATH };
const argsOf = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('dépôt de la photo du dossier', () => {
  it('prépare une photo en n’envoyant que le dossier', async () => {
    results.push({ data: row, error: null });
    expect(await insertPhoto(DOSSIER)).toEqual({ data: photo, error: null });
    expect(argsOf('from')).toEqual([['dossier_photo']]);
    expect(argsOf('insert')).toEqual([[{ dossier_id: DOSSIER }]]);
    results.push({ data: null, error: { code: '42501', message: 'not allowed' } });
    expect((await insertPhoto(DOSSIER)).error?.code).toBe('42501');
  });

  it('prépare un envoi signé dans le bucket dossier-photos, sans remplacement', async () => {
    results.push({ data: { signedUrl: 'https://x', path: PATH, token: 'tok' }, error: null });
    expect(await createPhotoUploadUrl(PATH)).toEqual({
      data: { path: PATH, token: 'tok' },
      error: null,
    });
    expect(argsOf('storage.from')).toEqual([['dossier-photos']]);
    const args = argsOf('createSignedUploadUrl');
    expect(args).toEqual([[PATH]]);
    expect(JSON.stringify(args)).not.toContain('upsert');
    results.push({ data: null, error: { message: 'denied' } });
    expect((await createPhotoUploadUrl(PATH)).error?.code).toBe('storage');
  });

  it('désigne la photo par la RPC et transmet son code', async () => {
    results.push({ data: null, error: null });
    expect(await setCurrentPhoto(PHOTO)).toEqual({ data: true, error: null });
    expect(argsOf('rpc')).toEqual([['set_dossier_photo', { p_photo_id: PHOTO }]]);
    results.push({ data: null, error: { code: 'TL012', message: 'photo already used' } });
    expect((await setCurrentPhoto(PHOTO)).error?.code).toBe('TL012');
  });

  it('lit la photo courante : activée et non archivée', async () => {
    results.push({ data: row, error: null });
    expect(await getCurrentPhoto(DOSSIER)).toEqual({ data: photo, error: null });
    expect(argsOf('eq')).toEqual([['dossier_id', DOSSIER]]);
    expect(argsOf('not')).toEqual([['activated_at', 'is', null]]);
    expect(argsOf('is')).toEqual([['archived_at', null]]);
    results.push({ data: null, error: null });
    expect(await getCurrentPhoto(DOSSIER)).toEqual({ data: null, error: null });
    results.push({ data: null, error: { code: 'PGRST301', message: 'jwt expired' } });
    expect((await getCurrentPhoto(DOSSIER)).error?.code).toBe('PGRST301');
  });

  it('télécharge les octets et refuse un fichier hors borne', async () => {
    results.push({ data: new Blob([new Uint8Array([0xff, 0xd8, 0xff])]), error: null });
    expect(await downloadPhoto(PATH)).toEqual({
      data: new Uint8Array([0xff, 0xd8, 0xff]),
      error: null,
    });
    expect(argsOf('download')).toEqual([[PATH]]);
    results.push({ data: new Blob([new Uint8Array(PHOTO_MAX_BYTES + 1)]), error: null });
    expect((await downloadPhoto(PATH)).error?.code).toBe('photo_too_large');
    results.push({ data: null, error: { message: 'boom' } });
    expect((await downloadPhoto(PATH)).error?.code).toBe('storage');
  });

  it('crée un lien de lecture de 5 minutes et nomme un objet absent', async () => {
    results.push({ data: { signedUrl: 'https://signed' }, error: null });
    expect(await createPhotoReadUrl(PATH)).toEqual({ data: 'https://signed', error: null });
    expect(argsOf('createSignedUrl')).toEqual([[PATH, 300]]);
    results.push({ data: null, error: { statusCode: '404', message: 'Object not found' } });
    expect((await createPhotoReadUrl(PATH)).error?.code).toBe('object_missing');
    results.push({ data: null, error: { message: 'boom' } });
    expect((await createPhotoReadUrl(PATH)).error?.code).toBe('storage');
  });
});
