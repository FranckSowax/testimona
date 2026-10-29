import { useTranslations } from 'next-intl';
import type { PanelGroup } from '../panel';
import type { QuoteStep } from '../quotes/repo';
import { QuoteRequestForm } from './QuoteRequestForm';

/** Demande de devis possible sur l'encadré : null sans le rôle coordinateur. */
export interface PanelQuote {
  dossierId: string;
  stepId: QuoteStep;
  /** Message préparé par prestataire contactable (id → message). */
  messages: Readonly<Record<string, string>>;
}

/**
 * Encadré prestataires d'une synthèse d'étape : une carte par prestataire (nom, quartier, prix
 * indicatif, badge « Vérifié » ou « Exemple »). Rien sans prestataire.
 * WHY: le numéro n'est jamais affiché ; seul un coordinateur peut demander un devis à un
 * prestataire vérifié, par une demande tracée qui donne le lien WhatsApp.
 *
 * @example
 * <ProviderPanel city="Libreville" groups={groups} quote={quote} />
 */
export function ProviderPanel({
  city,
  groups,
  quote,
}: {
  city: string;
  groups: readonly PanelGroup[];
  quote: PanelQuote | null;
}) {
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
                {/* WHY: le serveur ne prépare un message que pour un prestataire vérifié, non
                    exemple et avec numéro ; une carte sans message n'a pas de bouton. */}
                {quote?.messages[provider.id] && (
                  <QuoteRequestForm
                    dossierId={quote.dossierId}
                    providerId={provider.id}
                    providerName={provider.name}
                    stepId={quote.stepId}
                    message={quote.messages[provider.id]!}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
