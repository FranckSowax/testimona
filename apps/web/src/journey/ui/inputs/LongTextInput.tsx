import { LONG_TEXT_MAX } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export function LongTextInput(props: FieldProps<string>) {
  return (
    <textarea
      id={props.id}
      rows={6}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      maxLength={LONG_TEXT_MAX}
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
