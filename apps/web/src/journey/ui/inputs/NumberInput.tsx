import { FIELD_CLASS, type FieldProps } from '../field';

// WHY: limite large et fixe, indépendante de `max` : une saisie trop grande n'est pas tronquée
// en silence, le serveur répond « out of range » avec les bornes.
const INPUT_MAX_LENGTH = 15;
// Espaces, espace insécable (U+00A0) et fine insécable (U+202F) : séparateurs de milliers.
const THOUSANDS_SEPARATORS = /[\s\u00A0\u202F]/g;

/** Nombre entier saisi en chiffres ; le clavier numérique s'ouvre sur mobile. */
export function NumberInput(props: FieldProps<string>) {
  return (
    <input
      id={props.id}
      type="text"
      inputMode="numeric"
      // WHY: `pattern` fait ouvrir le clavier numérique sur les anciens iOS, qui ignorent
      // `inputMode` ; le formulaire est en `noValidate`, donc il ne bloque jamais l'envoi.
      pattern="[0-9]*"
      value={props.value}
      // WHY: on ne retire que les séparateurs de milliers ; tout autre caractère (lettre, signe,
      // virgule) reste visible et le serveur répond « invalid number », au lieu de le réécrire
      // en silence. Le curseur ne saute pas pour une saisie normale.
      onChange={(e) => props.onChange(e.target.value.replace(THOUSANDS_SEPARATORS, ''))}
      readOnly={props.readOnly}
      data-readonly={props.readOnly}
      maxLength={INPUT_MAX_LENGTH}
      autoComplete="off"
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
