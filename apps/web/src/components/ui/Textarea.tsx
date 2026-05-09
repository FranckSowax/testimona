import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { fieldClasses } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/**
 * V2 textarea — same gray field style as Input (#efefef bg, no border, semibold value).
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid = false, className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={[fieldClasses, 'resize-y', className ?? ''].filter(Boolean).join(' ')}
        {...rest}
      />
    );
  },
);
