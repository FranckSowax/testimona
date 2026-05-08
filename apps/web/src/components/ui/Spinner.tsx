import type { SVGProps } from 'react';

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: number;
  label?: string;
}

export function Spinner({
  size = 16,
  label = 'Loading',
  className,
  ...rest
}: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      role="status"
      aria-label={label}
      className={['animate-spin-slow', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" opacity="0.85" />
    </svg>
  );
}
