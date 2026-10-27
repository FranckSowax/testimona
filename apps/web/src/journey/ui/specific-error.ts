// WHY: ces messages Zod (types.ts) ont une cause précise que l'utilisateur peut corriger ;
// le message générique « validation » ne lui dirait pas quoi changer.
const SPECIFIC_MESSAGES = {
  'too large': 'tooLarge',
  'invalid date': 'invalidDate',
  'invalid character': 'invalidCharacter',
} as const;

type SpecificMessage = keyof typeof SPECIFIC_MESSAGES;

/**
 * Clé `journey.ui.*` du message précis correspondant aux erreurs de champ du serveur, ou null.
 *
 * @example
 * specificMessage({ '': 'too large' }); // 'tooLarge'
 */
export function specificMessage(
  fieldErrors: Record<string, string> | undefined,
): (typeof SPECIFIC_MESSAGES)[SpecificMessage] | null {
  const messages = Object.values(fieldErrors ?? {});
  const found = (Object.keys(SPECIFIC_MESSAGES) as SpecificMessage[]).find((message) =>
    messages.includes(message),
  );
  return found ? SPECIFIC_MESSAGES[found] : null;
}
