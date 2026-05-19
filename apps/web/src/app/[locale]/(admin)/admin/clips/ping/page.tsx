import { requireAdmin } from '@/lib/supabase/admin';
import { pingHiggsfield } from '@/lib/higgsfield/client';
import { AdminShell } from '@/components/admin/AdminShell';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HiggsfieldPingPage() {
  await requireAdmin();
  const result = await pingHiggsfield();

  return (
    <AdminShell title="Diagnostic Higgsfield">
      <div className="space-y-4">
        <Link
          href="/admin/clips"
          className="press-scale inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 font-display text-sm font-bold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          ← Retour
        </Link>

        {result.ok && result.mode === 'demo' && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
            <p className="font-display text-lg font-bold text-foreground">
              ⚠️ Mode demo actif
            </p>
            <p className="mt-2 text-sm text-foreground/80">
              Aucune variable Higgsfield trouvée dans l'environnement. Vérifie
              que les variables Railway sont bien définies :
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/80">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  HIGGSFIELD_API_ID
                </code>{' '}
                = ton KEY_ID
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  HIGGSFIELD_API_KEY
                </code>{' '}
                = ton KEY_SECRET
              </li>
            </ul>
          </div>
        )}

        {result.ok && result.mode === 'real' && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
            <p className="font-display text-lg font-bold text-emerald-700">
              ✓ Credentials valides
            </p>
            <p className="mt-2 text-sm text-emerald-700/90">
              L'authentification Higgsfield fonctionne correctement.
            </p>
          </div>
        )}

        {!result.ok && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <p className="font-display text-lg font-bold text-destructive">
              ✗ Credentials rejetés ({result.status})
            </p>
            <pre className="mt-3 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-foreground">
              {result.body || '(empty)'}
            </pre>
            <p className="mt-3 text-sm text-foreground/80">
              <strong>Diagnostic :</strong>
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
              <li>
                Longueur KEY_ID (HIGGSFIELD_API_ID) :{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {result.idLen}
                </code>
              </li>
              <li>
                Longueur KEY_SECRET (HIGGSFIELD_API_KEY) :{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {result.secretLen}
                </code>
              </li>
            </ul>
            <p className="mt-3 text-sm text-foreground/80">
              {result.status === 401
                ? 'Le 401 = Higgsfield refuse les credentials. Vérifie que tu n\'as pas inversé KEY_ID et KEY_SECRET, et qu\'il n\'y a pas d\'espace en début/fin de variable.'
                : 'Erreur réseau ou serveur — réessaie dans une minute.'}
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
