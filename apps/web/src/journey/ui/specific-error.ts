// WHY: ces messages Zod (types.ts) ont une cause précise que l'utilisateur peut corriger ;
// le message générique « validation » ne lui dirait pas quoi changer.
// Les valeurs sont des chemins de texte sous `journey` (espace de noms `journey.ui` ou
// `journey.draft`), pour ne dépendre d'aucune clé inexistante.
export const SPECIFIC_MESSAGES = {
  'too large': 'ui.tooLarge',
  'too long': 'ui.tooLarge',
  'invalid date': 'ui.invalidDate',
  'invalid character': 'ui.invalidCharacter',
  'invalid number': 'ui.invalidNumber',
  'out of range': 'ui.outOfRange',
  empty: 'draft.empty',
} as const;

type SpecificMessage = keyof typeof SPECIFIC_MESSAGES;

/** Chemin de texte, relatif à l'espace de noms `journey`, d'un message d'erreur précis. */
export type SpecificMessagePath = (typeof SPECIFIC_MESSAGES)[SpecificMessage];

/**
 * Chemin (sous `journey`) du message précis correspondant aux erreurs de champ du serveur,
 * ou null quand aucune cause n'est reconnue.
 *
 * @example
 * specificMessage({ '': 'too large' }); // 'ui.tooLarge'
 */
export function specificMessage(
  fieldErrors: Record<string, string> | undefined,
): SpecificMessagePath | null {
  const messages = Object.values(fieldErrors ?? {});
  const found = (Object.keys(SPECIFIC_MESSAGES) as SpecificMessage[]).find((message) =>
    messages.includes(message),
  );
  return found ? SPECIFIC_MESSAGES[found] : null;
}
