interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  current: number;
  ariaLabel: string;
  className?: string;
}

export function Stepper({ steps, current, ariaLabel, className }: StepperProps) {
  return (
    <ol
      aria-label={ariaLabel}
      className={[
        'flex items-center gap-2 overflow-x-auto',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span
              className={[
                'tabular inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                'font-display text-xs font-semibold',
                'transition-[background-color,color] duration-200',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/15 text-primary border-2 border-primary'
                    : 'bg-foreground/5 text-foreground/50',
              ].join(' ')}
            >
              {done ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span
              className={[
                'text-xs font-medium',
                active ? 'text-foreground' : 'text-foreground/60',
              ].join(' ')}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={[
                  'h-px w-8 transition-colors',
                  done ? 'bg-primary' : 'bg-border',
                ].join(' ')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
