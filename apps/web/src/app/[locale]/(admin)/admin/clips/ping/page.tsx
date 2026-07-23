import { requireAdmin } from '@/lib/supabase/admin';
import { pingHiggsfield, getActiveProvider } from '@/lib/higgsfield/client';
import { pingFal } from '@/lib/fal/client';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';

export const dynamic = 'force-dynamic';

const PROVIDER_LABEL: Record<'fal' | 'higgsfield' | 'demo', string> = {
  fal: 'fal.ai (Kling 2.1)',
  higgsfield: 'Higgsfield (DOP)',
  demo: 'Mode demo',
};

export default async function ProviderPingPage() {
  await requireAdmin();
  const provider = getActiveProvider();

  if (provider === 'demo') {
    return (
      <AdminShell title="Diagnostic fournisseur compute">
        <div className="space-y-4">
          <Link
            href="/admin/clips"
            className="press-scale inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 font-display text-sm font-bold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            ← Retour
          </Link>
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
            <p className="font-display text-lg font-bold text-foreground">
              ⚠️ Mode demo actif
            </p>
            <p className="mt-2 text-sm text-foreground/80">
              Aucune credential fournisseur trouvée dans l'environnement.
              Configure l'une de ces options sur Railway :
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/80">
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  FAL_KEY
                </code>{' '}
                pour passer par fal.ai / Kling 2.1 (recommandé)
              </li>
              <li>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  HIGGSFIELD_API_ID + HIGGSFIELD_API_KEY
                </code>{' '}
                pour Higgsfield DOP
              </li>
            </ul>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (provider === 'fal') {
    const r = await pingFal();
    return (
      <PingShell provider={provider}>
        {r.ok ? (
          <SuccessCard verdict={r.verdict} />
        ) : (
          <ErrorCard status={r.status} body={r.body} verdict={r.verdict} />
        )}
      </PingShell>
    );
  }

  // Higgsfield
  const r = await pingHiggsfield();
  return (
    <PingShell provider={provider}>
      {r.ok ? (
        <SuccessCard verdict={r.verdict} />
      ) : (
        <ErrorCard
          status={r.status}
          body={r.body}
          verdict={r.verdict}
          idLen={r.idLen}
          secretLen={r.secretLen}
          attempts={r.attempts}
        />
      )}
    </PingShell>
  );
}

function PingShell({
  provider,
  children,
}: {
  provider: 'fal' | 'higgsfield' | 'demo';
  children: React.ReactNode;
}) {
  return (
    <AdminShell title="Diagnostic fournisseur compute">
      <div className="space-y-4">
        <Link
          href="/admin/clips"
          className="press-scale inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 font-display text-sm font-bold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          ← Retour
        </Link>
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Fournisseur actif :{' '}
          <span className="font-display font-bold text-foreground">
            {PROVIDER_LABEL[provider]}
          </span>
        </p>
        {children}
      </div>
    </AdminShell>
  );
}

function SuccessCard({ verdict }: { verdict?: string }) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
      <p className="font-display text-lg font-bold text-emerald-700">
        ✓ Credentials valides
      </p>
      <p className="mt-2 text-sm text-emerald-700/90">
        L'authentification fonctionne correctement.
      </p>
      {verdict && (
        <p className="mt-2 font-mono text-[11px] text-emerald-700/70">
          {verdict}
        </p>
      )}
    </div>
  );
}

interface ErrorCardProps {
  status: number;
  body: string;
  verdict: string;
  idLen?: number;
  secretLen?: number;
  attempts?: { scheme: string; status: number; body: string }[];
}

function ErrorCard({
  status,
  body,
  verdict,
  idLen,
  secretLen,
  attempts,
}: ErrorCardProps) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
      <p className="font-display text-lg font-bold text-destructive">
        ✗ {status === 401 ? 'Credentials rejetés' : `Erreur ${status}`} ({status})
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-white px-3 py-2 text-xs text-foreground">
        {body || '(empty)'}
      </pre>
      <p className="mt-3 text-sm text-foreground/80">{verdict}</p>

      {idLen !== undefined && secretLen !== undefined && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>
            Longueur ID :{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {idLen}
            </code>{' '}
            {idLen === 36 ? '✓ format UUID' : '⚠️ longueur inattendue'}
          </li>
          <li>
            Longueur secret :{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {secretLen}
            </code>{' '}
            {secretLen === 36 ? '✓ format UUID' : '⚠️ longueur inattendue'}
          </li>
        </ul>
      )}

      {attempts && attempts.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-foreground/70">
            Détail des {attempts.length} tentatives d'auth
          </summary>
          <table className="mt-2 w-full overflow-hidden rounded border border-border text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-1 text-left font-display font-bold">Scheme</th>
                <th className="px-2 py-1 text-left font-display font-bold">Status</th>
                <th className="px-2 py-1 text-left font-display font-bold">Body</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={i} className="border-t border-border bg-white">
                  <td className="px-2 py-1 font-mono">{a.scheme}</td>
                  <td className="px-2 py-1 font-mono">{a.status}</td>
                  <td className="px-2 py-1 font-mono text-foreground/70">
                    {a.body || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
