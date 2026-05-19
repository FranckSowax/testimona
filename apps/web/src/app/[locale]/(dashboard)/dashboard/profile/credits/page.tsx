import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import {
  CREDIT_PACKS,
  getBalance,
  getRecentTransactions,
} from '@/lib/credits/balance';
import { BuyCreditsForm } from './BuyCreditsForm';

export const dynamic = 'force-dynamic';

const TX_LABELS: Record<string, string> = {
  purchase: 'Achat',
  spend: 'Animation',
  refund: 'Remboursement',
  admin_grant: 'Bonus admin',
  demo_grant: 'Demo',
};

export default async function CreditsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/profile/credits');

  const [balance, txs] = await Promise.all([
    getBalance(user.id),
    getRecentTransactions(user.id, 30),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <header className="space-y-2">
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Profil · Crédits
        </p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Crédits Testimona
        </h1>
        <p className="text-sm text-muted-foreground">
          1 crédit = 1 animation de 5 à 7 secondes. Utilise tes crédits pour
          faire vivre les photos d'un mémorial.
        </p>
      </header>

      <section
        aria-label="Solde courant"
        className="rounded-2xl border border-border bg-gradient-to-br from-surface to-white p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ton solde
        </p>
        <p className="mt-1 flex items-baseline gap-3 font-display">
          <span className="text-5xl font-bold text-foreground tabular sm:text-6xl">
            {balance}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            crédit{balance === 1 ? '' : 's'}
          </span>
        </p>
      </section>

      <section aria-labelledby="packs-heading">
        <h2
          id="packs-heading"
          className="mb-4 font-display text-xl font-bold text-foreground"
        >
          Acheter des crédits
        </h2>
        <p className="mb-4 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground/80">
          <strong>Mode demo</strong> — aucun paiement réel. Le pack est crédité
          instantanément à des fins de test.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack, i) => (
            <BuyCreditsForm
              key={pack.id}
              packId={pack.id}
              label={pack.label}
              credits={pack.credits}
              priceCents={pack.priceCents}
              highlight={i === 1}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="history-heading">
        <h2
          id="history-heading"
          className="mb-4 font-display text-xl font-bold text-foreground"
        >
          Historique
        </h2>
        {txs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-muted/50 px-4 py-6 text-center text-sm italic text-muted-foreground">
            Aucune transaction encore.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white">
            {txs.map((tx) => {
              const positive = tx.amount > 0;
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-foreground">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </p>
                    {tx.note && (
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.note}
                      </p>
                    )}
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <span
                    className={[
                      'tabular font-display text-base font-bold',
                      positive ? 'text-primary' : 'text-foreground/70',
                    ].join(' ')}
                  >
                    {positive ? '+' : ''}
                    {tx.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
