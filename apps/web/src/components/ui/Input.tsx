import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

/**
 * V2 form field shared classes (Florence Chan PDF spec).
 * - Background gray #efefef (var --color-bg-active-gray)
 * - No visible border (transparent)
 * - Rounded 6px, padding 12-16px
 * - Font semibold #2d3250 (#788199 placeholder)
 * - Focus : bg white + teal border + glow
 */
export const fieldClasses = [
  'block w-full rounded-md border border-transparent bg-[var(--color-bg-active-gray)]',
  'px-4 py-3 text-base font-semibold text-foreground sm:text-[15px]',
  'placeholder:font-medium placeholder:text-muted-foreground',
  'transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--motion-ease-out)]',
  'focus:bg-white focus:border-primary focus:outline-none focus:shadow-[var(--shadow-glow-primary)]',
  'aria-invalid:border-destructive aria-invalid:focus:shadow-none',
].join(' ');

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, iconLeft, iconRight, className, ...rest },
  ref,
) {
  if (iconLeft || iconRight) {
    const wrapperClasses = [
      'flex items-center gap-2 rounded-md border border-transparent bg-[var(--color-bg-active-gray)]',
      'px-3 py-2.5 text-base text-foreground sm:text-[15px]',
      'transition-[background-color,border-color,box-shadow] duration-150',
      'focus-within:bg-white focus-within:border-primary focus-within:shadow-[var(--shadow-glow-primary)]',
      invalid
        ? 'border-destructive focus-within:border-destructive focus-within:shadow-none'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={[wrapperClasses, className ?? ''].filter(Boolean).join(' ')}>
        {iconLeft && (
          <span className="text-muted-foreground" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground"
          {...rest}
        />
        {iconRight && (
          <span className="text-muted-foreground" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[fieldClasses, className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    />
  );
});
