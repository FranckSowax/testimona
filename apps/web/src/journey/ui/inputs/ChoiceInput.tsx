import { useTranslations } from 'next-intl';
import type { ChoiceQuestion } from '../../types';
import type { FieldProps } from '../field';

/** Choix unique en boutons radio ; libellés : `journey.q.<clé>.options.<option>`. */
export function ChoiceInput({
  question,
  ...props
}: FieldProps<string> & { question: ChoiceQuestion }) {
  const t = useTranslations('journey.q');
  // WHY: l'identifiant va sur l'option cochée (sinon la première) pour que le focus d'erreur s'y pose.
  const anchor = question.options.includes(props.value) ? props.value : question.options[0];
  return (
    <div
      role="radiogroup"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      aria-invalid={props.invalid}
      className="space-y-3"
    >
      {question.options.map((option) => (
        <label
          key={option}
          className={`has-[:focus-visible]:ring-accent-soft block cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:ring-2 ${
            props.value === option
              ? 'text-foreground border-white bg-white font-semibold'
              : 'border-white/30'
          }`}
        >
          <input
            id={option === anchor ? props.id : undefined}
            type="radio"
            name={`choice-${question.key}`}
            value={option}
            checked={props.value === option}
            onChange={() => props.onChange(option)}
            disabled={props.readOnly}
            className="sr-only"
          />
          {t(`${question.key}.options.${option}`)}
        </label>
      ))}
    </div>
  );
}
