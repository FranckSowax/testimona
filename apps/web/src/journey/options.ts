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

/** Niveaux de cérémonie, du plus simple au plus complet (budget, étape B.2). */
export const LEVELS = ['sober', 'intermediate', 'full'] as const;
export type Level = (typeof LEVELS)[number];

/** Réponse oui / non d'une question à choix. */
export const YES_NO = ['yes', 'no'] as const;

/** Étape 3.1 : type de lieu de la veillée. */
export const VIGIL_PLACE_TYPES = ['familyHome', 'rentedHall', 'neighbourhood'] as const;
/** Étape 3.1 : abri des invités. */
export const SHELTERS = ['tents', 'hall'] as const;
/** Étape 3.1 : sièges. */
export const SEATINGS = ['chairs', 'benches', 'mixed'] as const;

/** Étape 3.2 : ce qui est servi chaque soir de veillée. */
export const SERVINGS = ['nothing', 'snack', 'meal'] as const;
/** Étape 3.2 : qui prépare les repas. */
export const COOKS = ['family', 'caterer'] as const;
/** Étape 3.2 : boissons servies. */
export const DRINKS = ['soft', 'alcohol'] as const;
