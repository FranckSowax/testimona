import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, iconLeft, iconRight, className, ...rest },
  ref,
) {
  const wrapperClasses = [
    'flex items-center gap-2 rounded-md border bg-white',
    'px-3 h-11 text-sm text-foreground',
    'transition-[border-color,box-shadow]',
    'duration-150 ease-[var(--motion-ease-out)]',
    'focus-within:border-primary focus-within:shadow-[var(--shadow-glow-primary)]',
    invalid
      ? 'border-destructive focus-within:border-destructive focus-within:shadow-none'
      : 'border-border',
  ].join(' ');

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
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        {...rest}
      />
      {iconRight && (
        <span className="text-muted-foreground" aria-hidden="true">
          {iconRight}
        </span>
      )}
    </span>
  );
});
