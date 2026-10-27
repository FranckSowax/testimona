import { FIELD_CLASS, type FieldProps } from '../field';

export function DateInput(props: FieldProps<string>) {
  return (
    <input
      id={props.id}
      type="date"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      data-readonly={props.readOnly}
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
