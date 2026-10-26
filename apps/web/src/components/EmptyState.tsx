import Image from 'next/image';
import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-border bg-surface mx-auto flex max-w-md flex-col items-center rounded-lg border border-dashed px-6 py-12 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(45,50,80,0.04),0_1px_3px_rgba(45,50,80,0.06)]">
        {icon ?? (
          <Image
            src="/images/dove.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 opacity-70"
          />
        )}
      </div>
      <h3 className="font-display text-foreground text-xl font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
