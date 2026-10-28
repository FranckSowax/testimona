import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: doublure minimale du client Supabase. Chaque appel terminal (single, maybeSingle, returns,
// appels du stockage) consomme la réponse suivante de la file ; les autres renvoient la chaîne.
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
  for (const method of ['from', 'select', 'insert', 'update', 'eq', 'not']) {
    chain[method] = track(method, () => chain);
  }
  chain.single = track('single', next);
  chain.maybeSingle = track('maybeSingle', next);
  chain.returns = track('returns', next);
  const bucket = {
    createSignedUploadUrl: track('createSignedUploadUrl', next),
    download: track('download', next),
    createSignedUrl: track('createSignedUrl', next),
  };
  chain.storage = { from: track('storage.from', () => bucket) };
  return { getSupabaseServer: async () => chain };
});

const {
  attachReceipt,
  createUploadUrl,
  downloadReceipt,
  getReceipt,
  insertReceipt,
  listReceiptsByEntry,
  signedReadUrl,
} = await import('./repo');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const RECEIPT = '77777777-7777-4777-8777-777777777777';
const ENTRY = '88888888-8888-4888-8888-888888888888';
const PATH = `${DOSSIER}/${RECEIPT}.jpg`;
const row = {
  id: RECEIPT,
  dossier_id: DOSSIER,
  entry_id: null,
  storage_path: PATH,
  mime_type: 'image/jpeg',
  size_bytes: 1000,
};
const argsOf = (method: string) => calls.filter((c) => c.method === method).map((c) => c.args);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('dépôt des reçus', () => {
  it('prépare un reçu sans envoyer ni chemin ni auteur', async () => {
    results.push({ data: row, error: null });
    expect(await insertReceipt(DOSSIER, 'image/jpeg', 1000)).toEqual({
      data: {
        id: RECEIPT,
        dossierId: DOSSIER,
        entryId: null,
        storagePath: PATH,
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      },
      error: null,
    });
    expect(argsOf('insert')).toEqual([
      [{ dossier_id: DOSSIER, mime_type: 'image/jpeg', size_bytes: 1000 }],
    ]);
  });

  it('renvoie null pour un reçu invisible et transmet le code d’erreur', async () => {
    results.push({ data: null, error: null });
    expect(await getReceipt(RECEIPT)).toEqual({ data: null, error: null });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    expect((await getReceipt(RECEIPT)).error?.code).toBe('42501');
    spy.mockRestore();
  });

  it('rattache un reçu et signale une mise à jour sans effet', async () => {
    results.push({ data: [{ id: RECEIPT }], error: null });
    expect(await attachReceipt(DOSSIER, RECEIPT, ENTRY)).toEqual({ data: true, error: null });
    expect(argsOf('update')).toEqual([[{ entry_id: ENTRY }]]);
    expect(argsOf('eq')).toEqual([
      ['dossier_id', DOSSIER],
      ['id', RECEIPT],
    ]);
    results.push({ data: [], error: null });
    expect((await attachReceipt(DOSSIER, RECEIPT, ENTRY)).error?.code).toBe('no_rows');
  });

  it('range les reçus rattachés par dépense', async () => {
    results.push({ data: [{ id: RECEIPT, entry_id: ENTRY }], error: null });
    const res = await listReceiptsByEntry(DOSSIER);
    expect(res.data).toEqual(new Map([[ENTRY, RECEIPT]]));
    expect(argsOf('not')).toEqual([['entry_id', 'is', null]]);
  });

  it('prépare un envoi signé dans le bucket receipts', async () => {
    results.push({ data: { signedUrl: 'https://x', path: PATH, token: 'tok' }, error: null });
    expect(await createUploadUrl(PATH)).toEqual({
      data: { path: PATH, token: 'tok' },
      error: null,
    });
    expect(argsOf('storage.from')).toEqual([['receipts']]);
    expect(argsOf('createSignedUploadUrl')).toEqual([[PATH]]);
    results.push({ data: null, error: { message: 'nope' } });
    expect((await createUploadUrl(PATH)).error?.code).toBe('storage');
  });

  it('ne demande jamais de remplacement (upsert) au stockage', async () => {
    results.push({ data: { signedUrl: 'https://x', path: PATH, token: 'tok' }, error: null });
    await createUploadUrl(PATH);
    // WHY: sans upsert, le lien d'envoi ne sert qu'une fois (unicité bucket_id, name).
    const storageArgs = calls
      .filter((c) => ['createSignedUploadUrl', 'download', 'createSignedUrl'].includes(c.method))
      .flatMap((c) => c.args);
    expect(storageArgs.every((arg) => typeof arg !== 'object' || arg === null)).toBe(true);
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
        f.isDirectory()
          ? sources(join(dir, f.name))
          : /\.tsx?$/.test(f.name) && !/\.test\.tsx?$/.test(f.name)
            ? [join(dir, f.name)]
            : [],
      );
    expect(sources(__dirname)).toContain(join(__dirname, 'repo.ts'));
    const withUpsert = sources(__dirname).filter((f) => /upsert/i.test(readFileSync(f, 'utf8')));
    expect(withUpsert).toEqual([]);
  });

  it('télécharge la photo en octets', async () => {
    results.push({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null });
    expect((await downloadReceipt(PATH)).data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('crée un lien de lecture de 5 minutes', async () => {
    results.push({ data: { signedUrl: 'https://signed' }, error: null });
    expect(await signedReadUrl(PATH)).toEqual({ data: 'https://signed', error: null });
    expect(argsOf('createSignedUrl')).toEqual([[PATH, 300]]);
  });
});
