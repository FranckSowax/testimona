import type { ListItem, PlaceValue, Question } from '../types';
import type { FieldProps } from './field';
import { ChoiceInput } from './inputs/ChoiceInput';
import { DateInput } from './inputs/DateInput';
import { ListInput } from './inputs/ListInput';
import { LongTextInput } from './inputs/LongTextInput';
import { PlaceInput, type Country } from './inputs/PlaceInput';
import { ShortTextInput } from './inputs/ShortTextInput';
import type { EditableValue } from './values';

type Props = FieldProps<EditableValue> & {
  question: Question;
  countries: Country[];
  /** Identifiants DOM des champs de liste fautifs. */
  invalidIds: readonly string[];
};

/**
 * Champ de saisie adapté au type de la question.
 * WHY: `toEditable` garantit que la valeur a la forme attendue par le type, d'où les conversions.
 */
export function AnswerInput({ question, countries, invalidIds, ...props }: Props) {
  const text = { ...props, value: props.value as string };
  switch (question.kind) {
    case 'shortText':
      return <ShortTextInput {...text} />;
    case 'longText':
      return <LongTextInput {...text} />;
    case 'date':
      return <DateInput {...text} />;
    case 'choice':
      return <ChoiceInput {...text} question={question} />;
    case 'place':
      return <PlaceInput {...props} value={props.value as PlaceValue} countries={countries} />;
    case 'list':
      return (
        <ListInput
          {...props}
          value={props.value as ListItem[]}
          question={question}
          invalidIds={invalidIds}
        />
      );
  }
}
