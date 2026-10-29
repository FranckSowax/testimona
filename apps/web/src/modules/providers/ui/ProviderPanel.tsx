import { useTranslations } from 'next-intl';
import type { PanelGroup } from '../panel';

/**
 * Encadré prestataires d'une synthèse d'étape : une carte par prestataire (nom, quartier, prix
 * indicatif, badge « Vérifié » ou « Exemple »). Rien sans prestataire.
 * WHY: pas de numéro ici ; le contact passera par la demande de devis tracée (PR 3).
 *
 * @example
 * <ProviderPanel city="Libreville" groups={groups} />
 */
export function ProviderPanel({ city, groups }: { city: string; groups: readonly PanelGroup[] }) {
  const t = useTranslations('providers');
  if (groups.length === 0) return null;
  return (
    <section
      aria-labelledby="providers-panel-title"
      className="border-border space-y-4 rounded-2xl border p-5"
    >
      <header className="space-y-1">
        <h2
          id="providers-panel-title"
          className="font-display text-foreground text-lg font-semibold"
        >
          {t('panel.title', { city })}
        </h2>
        <p className="text-muted-foreground text-sm">{t('panel.intro')}</p>
      </header>
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-foreground font-semibold">{t(`category.${group.category}`)}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.providers.map((provider) => (
              <li key={provider.id} className="border-border space-y-1 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-foreground font-semibold">{provider.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      provider.isExample
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {provider.isExample ? t('panel.example') : t('panel.verified')}
                  </span>
                </div>
                {provider.district && (
                  <p className="text-muted-foreground text-sm">{provider.district}</p>
                )}
                {provider.priceNote && (
                  <p className="text-foreground text-sm">{provider.priceNote}</p>
                )}
                {provider.isExample && (
                  <p className="text-muted-foreground text-sm">{t('panel.exampleNotice')}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
