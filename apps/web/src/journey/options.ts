/** Cercles d'une personne à prévenir (spec, section 2). */
export const CIRCLES = [
  'close_family',
  'extended_family',
  'colleagues',
  'parish',
  'village',
  'other',
] as const;

/** Circonstances du décès que l'on accepte de mentionner, toujours formulées avec tact. */
export const CAUSES = ['none', 'illness', 'sudden', 'accident'] as const;
export type Cause = (typeof CAUSES)[number];

/** Tons des annonces (spec, section 2). */
export const TONES = ['believer', 'neutral'] as const;
export type Tone = (typeof TONES)[number];

/** Préférence de la famille pour les fleurs et les dons. */
export const FLOWERS = ['flowers', 'donations', 'both', 'noPreference'] as const;
export type Flowers = (typeof FLOWERS)[number];
