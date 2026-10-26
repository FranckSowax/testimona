import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'accent' | 'destructive';
type Style = 'solid' | 'outline' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  styleVariant?: Style;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 min-w-9 px-3 text-sm gap-1.5',
  md: 'h-11 min-w-11 px-5 text-sm gap-2',
  lg: 'h-12 min-w-12 px-6 text-base gap-2',
};

const SOLID: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 active:opacity-95 focus-visible:shadow-[var(--shadow-glow-primary)]',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 active:opacity-95',
  accent:
    'bg-accent text-accent-foreground hover:opacity-90 active:opacity-95 focus-visible:shadow-[var(--shadow-glow-accent)]',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 active:opacity-95',
};

const OUTLINE: Record<Variant, string> = {
  primary: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
  secondary:
    'border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground',
  accent: 'border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground',
  destructive:
    'border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground',
};

const GHOST: Record<Variant, string> = {
  primary: 'text-primary hover:bg-primary/10',
  secondary: 'text-secondary hover:bg-secondary/10',
  accent: 'text-accent hover:bg-accent/10',
  destructive: 'text-destructive hover:bg-destructive/10',
};

const LINK: Record<Variant, string> = {
  primary: 'text-primary hover:underline underline-offset-4 px-0 h-auto',
  secondary: 'text-secondary hover:underline underline-offset-4 px-0 h-auto',
  accent: 'text-accent hover:underline underline-offset-4 px-0 h-auto',
  destructive: 'text-destructive hover:underline underline-offset-4 px-0 h-auto',
};

function combine(variant: Variant, styleVariant: Style): string {
  switch (styleVariant) {
    case 'outline':
      return OUTLINE[variant];
    case 'ghost':
      return GHOST[variant];
    case 'link':
      return LINK[variant];
    default:
      return SOLID[variant];
  }
}

interface ButtonClassesOptions {
  variant?: Variant;
  styleVariant?: Style;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
}

export function buttonClasses({
  variant = 'primary',
  styleVariant = 'solid',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonClassesOptions = {}): string {
  return [
    'inline-flex items-center justify-center rounded-md font-medium font-display',
    'transition-[background-color,color,opacity,box-shadow,transform]',
    'duration-150 ease-[var(--motion-ease-out)]',
    'focus-visible:outline-none',
    'press-scale',
    SIZE_CLASSES[size],
    combine(variant, styleVariant),
    fullWidth ? 'w-full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    styleVariant = 'solid',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'font-display inline-flex items-center justify-center rounded-md font-medium',
        'transition-[background-color,color,opacity,box-shadow,transform]',
        'duration-150 ease-[var(--motion-ease-out)]',
        'focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'press-scale',
        SIZE_CLASSES[size],
        combine(variant, styleVariant),
        fullWidth ? 'w-full' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'sm' ? 14 : 16} aria-hidden="true" />
      ) : (
        iconLeft && <span aria-hidden="true">{iconLeft}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  );
});
