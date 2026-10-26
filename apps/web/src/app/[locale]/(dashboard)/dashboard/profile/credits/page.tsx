import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { CREDIT_PACKS, getBalance, getRecentTransactions } from '@/lib/credits/balance';
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
        <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Profil · Crédits
        </p>
        <h1 className="font-display text-foreground text-3xl font-bold">Crédits Testimona</h1>
        <p className="text-muted-foreground text-sm">
          1 crédit = 1 animation de 5 à 7 secondes. Utilise tes crédits pour faire vivre les photos
          d’un mémorial.
        </p>
      </header>

      <section
        aria-label="Solde courant"
        className="border-border from-surface rounded-2xl border bg-gradient-to-br to-white p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <p className="font-display text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Ton solde
        </p>
        <p className="font-display mt-1 flex items-baseline gap-3">
          <span className="text-foreground tabular text-5xl font-bold sm:text-6xl">{balance}</span>
          <span className="text-muted-foreground text-sm font-medium">
            crédit{balance === 1 ? '' : 's'}
          </span>
        </p>
      </section>

      <section aria-labelledby="packs-heading">
        <h2 id="packs-heading" className="font-display text-foreground mb-4 text-xl font-bold">
          Acheter des crédits
        </h2>
        <p className="border-accent/30 bg-accent/5 text-foreground/80 mb-4 rounded-md border px-3 py-2 text-xs">
          <strong>Mode demo</strong> — aucun paiement réel. Le pack est crédité instantanément à des
          fins de test.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack, i) => (
            <BuyCreditsForm
              key={pack.id}
              packId={pack.id}
              label={pack.label}
              credits={pack.credits}
              priceCents={pack.priceCents}
              baselinePerCreditCents={CREDIT_PACKS[0]!.priceCents / CREDIT_PACKS[0]!.credits}
              highlight={i === 1}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="font-display text-foreground mb-4 text-xl font-bold">
          Historique
        </h2>
        {txs.length === 0 ? (
          <p className="border-border bg-muted/50 text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm italic">
            Aucune transaction encore.
          </p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border bg-white">
            {txs.map((tx) => {
              const positive = tx.amount > 0;
              return (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-foreground text-sm font-bold">
                      {TX_LABELS[tx.type] ?? tx.type}
                    </p>
                    {tx.note && <p className="text-muted-foreground truncate text-xs">{tx.note}</p>}
                    <p
                      className="text-muted-foreground text-[11px] uppercase tracking-wide"
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
