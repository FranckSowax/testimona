import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, className, id, disabled, ...rest },
  ref,
) {
  const control = (
    <span
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'bg-foreground/20 transition-[background-color,box-shadow]',
        'duration-200 ease-[var(--motion-ease-out)]',
        'peer-checked:bg-primary',
        'peer-focus-visible:shadow-[var(--shadow-glow-primary)]',
        'peer-disabled:opacity-50',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <span
        className={[
          'absolute left-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-[var(--motion-spring)]',
          'peer-checked:translate-x-5',
        ].join(' ')}
      />
    </span>
  );

  if (!label && !description) {
    return (
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          {...rest}
        />
        {control}
      </label>
    );
  }

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        disabled={disabled}
        className="peer sr-only"
        {...rest}
      />
      {control}
      <span className="flex-1 text-sm">
        {label && (
          <span className="block font-medium font-display text-foreground">
            {label}
          </span>
        )}
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
});
