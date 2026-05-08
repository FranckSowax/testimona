import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={[
          'block w-full rounded-md border bg-white px-3 py-2.5 text-sm text-foreground',
          'placeholder:text-muted-foreground',
          'transition-[border-color,box-shadow] duration-150 ease-[var(--motion-ease-out)]',
          'focus:outline-none focus:border-primary focus:shadow-[var(--shadow-glow-primary)]',
          'resize-y',
          invalid
            ? 'border-destructive focus:border-destructive focus:shadow-none'
            : 'border-border',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    );
  },
);
