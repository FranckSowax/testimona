import { SHORT_TEXT_MAX } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export function ShortTextInput(props: FieldProps<string>) {
  return (
    <input
      id={props.id}
      type="text"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      maxLength={SHORT_TEXT_MAX}
      autoComplete="off"
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
