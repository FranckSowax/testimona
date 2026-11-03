import 'server-only';
import { getTranslations } from 'next-intl/server';
import { TONES, type Tone } from '@/journey/options';
import type { TemplateLocale } from '@/journey/templates';

/** Textes de départ du livret ; l'hommage n'en a pas (il se nourrit de la biographie). */
export interface DocumentStarterTexts {
  cover: string;
  thanks: string;
}

/**
 * Phrase de couverture et remerciements de départ, croyants ou neutres, quand l'IA est absente
 * ou que la famille préfère partir d'un texte simple. Un ton inconnu ou absent donne `neutral`.
 * WHY: lu côté serveur par la page de synthèse de l'étape 3.5, puis passé au composant client ;
 * la langue est explicite pour ne dépendre d'aucun contexte de requête.
 *
 * @example
 * const starters = await documentStarterTexts(answers['ceremony.tone'], 'fr');
 */
export async function documentStarterTexts(
  tone: unknown,
  locale: TemplateLocale,
): Promise<DocumentStarterTexts> {
  const variant: Tone = TONES.find((code) => code === tone) ?? 'neutral';
  const t = await getTranslations({ locale, namespace: 'documents.starter' });
  return { cover: t(`cover.${variant}`), thanks: t(`thanks.${variant}`) };
}
