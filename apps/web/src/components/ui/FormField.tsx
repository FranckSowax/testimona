import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  hideLabel?: boolean;
}

export function FormField({
  label,
  children,
  hint,
  error,
  required = false,
  hideLabel = false,
}: FormFieldProps) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        invalid: Boolean(error),
        required,
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={fieldId}
        className={[
          'font-display text-foreground block text-sm font-medium',
          hideLabel ? 'sr-only' : '',
        ].join(' ')}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-accent ml-0.5">
            *
          </span>
        )}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
