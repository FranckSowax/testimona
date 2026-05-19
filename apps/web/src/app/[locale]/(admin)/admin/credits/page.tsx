import { requireAdmin, getSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  STUDIA_COST_PER_VIDEO,
  STUDIA_PACKS,
  getStudiaBalance,
  getStudiaTransactions,
} from '@/lib/compute/balance';
import { GrantCreditsForm } from './GrantCreditsForm';
import { StudiaTopUpForm } from './StudiaTopUpForm';

export const dynamic = 'force-dynamic';

interface CreditRow {
  userId: string;
  balance: number;
  updatedAt: string;
}

interface TxRow {
  id: string;
  userId: string;
  amount: number;
  type: string;
  note: string | null;
  createdAt: string;
}

const STUDIA_TX_LABEL: Record<string, string> = {
  topup: 'Recharge',
  spend: 'Génération',
  refund: 'Remboursement',
  adjust: 'Ajustement',
};

export default async function AdminCreditsPage() {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();

  const [
    studiaBalance,
    studiaTxs,
    creditsRes,
    txsRes,
    usersRes,
  ] = await Promise.all([
    getStudiaBalance(),
    getStudiaTransactions(20),
    supabase
      .from('UserCredit')
      .select('userId, balance, updatedAt')
      .order('balance', { ascending: false })
      .limit(100)
      .returns<CreditRow[]>(),
    supabase
      .from('CreditTransaction')
      .select('id, userId, amount, type, note, createdAt')
      .order('createdAt', { ascending: false })
      .limit(40)
      .returns<TxRow[]>(),
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const usersById = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? '—']),
  );
  const credits = creditsRes.data ?? [];
  const txs = txsRes.data ?? [];

  const totalUserCredits = credits.reduce((sum, c) => sum + c.balance, 0);
  const videosRemaining = Math.floor(studiaBalance / STUDIA_COST_PER_VIDEO);

  return (
    <AdminShell title="Gestion des crédits">
      {/* ─── Compute / Studia ───────────────────────────────── */}
      <section
        aria-labelledby="studia-heading"
        className="mb-10 rounded-2xl border border-border bg-gradient-to-br from-surface to-white p-5 shadow-[var(--shadow-card)] sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              id="studia-heading"
              className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Solde compute · Studia
            </p>
            <p className="mt-1 flex items-baseline gap-3 font-display">
              <span className="tabular text-5xl font-bold text-foreground sm:text-6xl">
                {studiaBalance.toFixed(0)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                crédits restants
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Soit{' '}
              <span className="font-display font-bold text-foreground tabular">
                ~{videosRemaining}
              </span>{' '}
              vidéos générables · {STUDIA_COST_PER_VIDEO} crédits/vidéo
            </p>
          </div>
          {studiaBalance < STUDIA_COST_PER_VIDEO * 5 && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
              ⚠️ Solde faible — recharge pour que tes users puissent générer
            </p>
          )}
        </div>

        <hr className="my-6 border-border" />

        <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Recharger le solde compute
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Studia Labs fournit le service compute (génération vidéo IA). Les
          packs sont facturés au coût studio + marge — c'est ce qui paie ton
          fournisseur de génération.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {STUDIA_PACKS.map((pack, i) => (
            <StudiaTopUpForm
              key={pack.id}
              id={pack.id}
              label={pack.label}
              credits={pack.credits}
              priceCents={pack.priceCents}
              highlight={i === 1}
            />
          ))}
        </div>
        <p className="mt-3 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
          <strong>Mode demo</strong> — la recharge est instantanée pour test,
          sans paiement réel. Le passage en réel se fait via Stripe.
        </p>
      </section>

      {/* ─── Historique compute ─────────────────────────────── */}
      <section className="mb-10" aria-labelledby="studia-history">
        <h2
          id="studia-history"
          className="mb-3 font-display text-lg font-bold text-foreground"
        >
          Activité compute récente
        </h2>
        {studiaTxs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-sm italic text-muted-foreground">
            Aucune activité compute encore.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white">
            {studiaTxs.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-foreground">
                    {STUDIA_TX_LABEL[tx.type] ?? tx.type}
                  </p>
                  {tx.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.note}
                    </p>
                  )}
                  <p
                    className="text-[11px] text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {new Date(tx.createdAt).toLocaleString('fr-FR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'Europe/Paris',
                    })}
                  </p>
                </div>
                <span
                  className={[
                    'tabular font-display text-base font-bold',
                    tx.amount > 0 ? 'text-primary' : 'text-foreground/70',
                  ].join(' ')}
                >
                  {tx.amount > 0 ? '+' : ''}
                  {Number(tx.amount).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <hr className="my-10 border-border" />

      {/* ─── Crédits utilisateurs ──────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-1 font-display text-xl font-bold text-foreground">
          Crédits utilisateurs
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Les crédits Testimona que tes utilisateurs achètent et dépensent.{' '}
          <span className="font-display font-bold text-foreground tabular">
            {totalUserCredits}
          </span>{' '}
          crédit{totalUserCredits === 1 ? '' : 's'} en circulation sur{' '}
          <span className="font-display font-bold text-foreground tabular">
            {credits.length}
          </span>{' '}
          utilisateur{credits.length === 1 ? '' : 's'}.
        </p>
      </section>

      <section className="mb-8 rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 font-display text-base font-bold text-foreground">
          Créditer / débiter un utilisateur
        </h3>
        <GrantCreditsForm />
      </section>

      <section className="mb-8">
        <h3 className="mb-3 font-display text-base font-bold text-foreground">
          Soldes par utilisateur
        </h3>
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {credits.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {usersById.get(c.userId) ?? c.userId.slice(0, 8)}
                </p>
                <p
                  className="text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  Maj{' '}
                  {new Date(c.updatedAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'Europe/Paris',
                  })}
                </p>
              </div>
              <span className="tabular font-display text-lg font-bold text-foreground">
                {c.balance}
              </span>
            </li>
          ))}
          {credits.length === 0 && (
            <li className="px-4 py-6 text-center text-sm italic text-muted-foreground">
              Aucun crédit utilisateur attribué.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-display text-base font-bold text-foreground">
          Transactions utilisateurs récentes
        </h3>
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {txs.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {usersById.get(tx.userId) ?? tx.userId.slice(0, 8)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {tx.type}
                  {tx.note ? ` · ${tx.note}` : ''}
                </p>
                <p
                  className="text-[11px] text-muted-foreground"
                  suppressHydrationWarning
                >
                  {new Date(tx.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'Europe/Paris',
                  })}
                </p>
              </div>
              <span
                className={[
                  'tabular font-display text-base font-bold',
                  tx.amount > 0 ? 'text-primary' : 'text-foreground/70',
                ].join(' ')}
              >
                {tx.amount > 0 ? '+' : ''}
                {tx.amount}
              </span>
            </li>
          ))}
          {txs.length === 0 && (
            <li className="px-4 py-6 text-center text-sm italic text-muted-foreground">
              Aucune transaction.
            </li>
          )}
        </ul>
      </section>
    </AdminShell>
  );
}
