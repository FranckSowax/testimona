import { useTranslations } from 'next-intl';
import { formatClosedOn } from '@/modules/budget/closing/model';
import type { QuoteHistoryItem } from '../quote-service';

/**
 * « Devis demandés » d'une étape : prestataire, date et auteur, pour qu'un autre membre ne
 * relance pas le même prestataire. Rien sans demande.
 * WHY: `formatClosedOn` est le formateur de date longue du projet (fuseau du registre, repli sur
 * une date invalide) ; on le réutilise plutôt que d'en écrire un second.
 *
 * @example
 * <QuoteHistory items={items} locale="fr" />
 */
export function QuoteHistory({
  items,
  locale,
}: {
  items: readonly QuoteHistoryItem[];
  locale: string;
}) {
  const t = useTranslations('providers.quote.history');
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="quote-history-title" className="space-y-2">
      <h2 id="quote-history-title" className="font-display text-foreground text-lg font-semibold">
        {t('title')}
      </h2>
      <ul className="text-foreground space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            {t('item', {
              provider: item.providerName,
              date: formatClosedOn(item.createdAt, locale),
            })}{' '}
            <span className="text-muted-foreground">
              {item.author ? t('by', { author: item.author }) : t('unknownAuthor')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
