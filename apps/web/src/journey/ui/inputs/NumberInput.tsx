import type { NumberQuestion } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

/** Nombre entier saisi en chiffres ; le clavier numérique s'ouvre sur mobile. */
export function NumberInput({
  question,
  ...props
}: FieldProps<string> & { question: NumberQuestion }) {
  return (
    <input
      id={props.id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={props.value}
      // WHY: on ne garde que les chiffres ; les bornes sont vérifiées par le serveur.
      onChange={(e) => props.onChange(e.target.value.replace(/\D/g, ''))}
      readOnly={props.readOnly}
      data-readonly={props.readOnly}
      maxLength={String(question.max).length}
      autoComplete="off"
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
