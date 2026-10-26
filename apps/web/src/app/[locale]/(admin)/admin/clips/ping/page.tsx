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
            className="press-scale font-display text-muted-foreground hover:bg-surface hover:text-foreground inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 text-sm font-bold transition-colors"
          >
            ← Retour
          </Link>
          <div className="border-accent/30 bg-accent/5 rounded-lg border p-5">
            <p className="font-display text-foreground text-lg font-bold">⚠️ Mode demo actif</p>
            <p className="text-foreground/80 mt-2 text-sm">
              Aucune credential fournisseur trouvée dans l’environnement. Configure l’une de ces
              options sur Railway :
            </p>
            <ul className="text-foreground/80 mt-3 list-disc space-y-1 pl-5 text-sm">
              <li>
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">FAL_KEY</code>{' '}
                pour passer par fal.ai / Kling 2.1 (recommandé)
              </li>
              <li>
                <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
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
          className="press-scale font-display text-muted-foreground hover:bg-surface hover:text-foreground inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 text-sm font-bold transition-colors"
        >
          ← Retour
        </Link>
        <p className="border-border bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-xs">
          Fournisseur actif :{' '}
          <span className="font-display text-foreground font-bold">{PROVIDER_LABEL[provider]}</span>
        </p>
        {children}
      </div>
    </AdminShell>
  );
}

function SuccessCard({ verdict }: { verdict?: string }) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
      <p className="font-display text-lg font-bold text-emerald-700">✓ Credentials valides</p>
      <p className="mt-2 text-sm text-emerald-700/90">
        L’authentification fonctionne correctement.
      </p>
      {verdict && <p className="mt-2 font-mono text-[11px] text-emerald-700/70">{verdict}</p>}
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

function ErrorCard({ status, body, verdict, idLen, secretLen, attempts }: ErrorCardProps) {
  return (
    <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-5">
      <p className="font-display text-destructive text-lg font-bold">
        ✗ {status === 401 ? 'Credentials rejetés' : `Erreur ${status}`} ({status})
      </p>
      <pre className="text-foreground mt-3 overflow-x-auto rounded bg-white px-3 py-2 text-xs">
        {body || '(empty)'}
      </pre>
      <p className="text-foreground/80 mt-3 text-sm">{verdict}</p>

      {idLen !== undefined && secretLen !== undefined && (
        <ul className="text-foreground/80 mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            Longueur ID :{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{idLen}</code>{' '}
            {idLen === 36 ? '✓ format UUID' : '⚠️ longueur inattendue'}
          </li>
          <li>
            Longueur secret :{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">{secretLen}</code>{' '}
            {secretLen === 36 ? '✓ format UUID' : '⚠️ longueur inattendue'}
          </li>
        </ul>
      )}

      {attempts && attempts.length > 0 && (
        <details className="mt-4">
          <summary className="text-foreground/70 cursor-pointer text-xs font-bold uppercase tracking-wider">
            Détail des {attempts.length} tentatives d’auth
          </summary>
          <table className="border-border mt-2 w-full overflow-hidden rounded border text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="font-display px-2 py-1 text-left font-bold">Scheme</th>
                <th className="font-display px-2 py-1 text-left font-bold">Status</th>
                <th className="font-display px-2 py-1 text-left font-bold">Body</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={i} className="border-border border-t bg-white">
                  <td className="px-2 py-1 font-mono">{a.scheme}</td>
                  <td className="px-2 py-1 font-mono">{a.status}</td>
                  <td className="text-foreground/70 px-2 py-1 font-mono">{a.body || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
