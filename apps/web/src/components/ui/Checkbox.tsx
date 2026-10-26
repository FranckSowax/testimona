import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      className={[
        'border-border h-5 w-5 shrink-0 cursor-pointer rounded border-2',
        'accent-primary',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-primary focus-visible:shadow-[var(--shadow-glow-primary)] focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );

  if (!label) return input;

  return (
    <label className="text-foreground inline-flex cursor-pointer items-start gap-2.5 text-sm">
      {input}
      <span className="leading-tight">{label}</span>
    </label>
  );
});
