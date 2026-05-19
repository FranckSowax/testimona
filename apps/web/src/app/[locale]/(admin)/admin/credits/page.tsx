import { requireAdmin, getSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminShell } from '@/components/admin/AdminShell';
import { GrantCreditsForm } from './GrantCreditsForm';

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

export default async function AdminCreditsPage() {
  await requireAdmin();
  const supabase = getSupabaseAdminClient();

  const [creditsRes, txsRes, usersRes] = await Promise.all([
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

  const totalCredits = credits.reduce((sum, c) => sum + c.balance, 0);

  return (
    <AdminShell title="Crédits Testimona">
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Tile label="Crédits en circulation" value={totalCredits} />
        <Tile label="Utilisateurs actifs" value={credits.length} />
        <Tile
          label="Transactions récentes"
          value={txs.length}
        />
      </section>

      <section className="mb-8 rounded-xl border border-border bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Créditer / débiter un utilisateur
        </h2>
        <GrantCreditsForm />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Soldes par utilisateur
        </h2>
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
              Aucun crédit attribué.
            </li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground">
          Transactions récentes
        </h2>
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

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="font-display text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="tabular mt-1 font-display text-2xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}
