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
        'h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-border',
        'accent-primary',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[var(--shadow-glow-primary)]',
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
    <label className="inline-flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
      {input}
      <span className="leading-tight">{label}</span>
    </label>
  );
});
