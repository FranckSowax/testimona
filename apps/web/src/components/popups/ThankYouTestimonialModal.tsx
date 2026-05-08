'use client';

import { Avatar } from '@/components/ui/Avatar';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { PopupCard } from './PopupCard';

interface ThankYouTestimonialModalProps {
  open: boolean;
  onClose: () => void;
  authorAvatarUrl?: string | null;
  authorName?: string;
  memorialName: string;
  memorialCoverUrl?: string | null;
  onViewMemorial: () => void;
  onIncludeDonation: () => void;
}

/**
 * V2 popup "Thank you for your testimonial" (PDF p15).
 */
export function ThankYouTestimonialModal({
  open,
  onClose,
  authorAvatarUrl,
  authorName,
  memorialName,
  memorialCoverUrl,
  onViewMemorial,
  onIncludeDonation,
}: ThankYouTestimonialModalProps) {
  return (
    <PopupCard open={open} onClose={onClose} ariaLabel="Thank you for your testimonial" width="lg">
      <div className="space-y-5 text-center">
        <header>
          <h2 className="relative inline-block">
            <span aria-hidden="true" className="absolute -left-8 top-3 text-xl text-[var(--color-primary-soft)]">
              ♡
            </span>
            <span
              className="-rotate-2 inline-block text-5xl text-accent sm:text-6xl"
              style={{ fontFamily: 'var(--font-cursive)' }}
            >
              Thank you!
            </span>
            <span aria-hidden="true" className="absolute -right-8 top-3 text-xl text-accent">
              ♥
            </span>
          </h2>
        </header>

        <div className="flex justify-center">
          <Avatar src={authorAvatarUrl} name={authorName} size="lg" />
        </div>

        <p className="text-sm leading-relaxed text-foreground">
          <span className="inline-flex items-center gap-2">
            <Avatar
              src={memorialCoverUrl}
              name={memorialName}
              size="xs"
              border="rose"
            />
            <span className="font-display font-bold">{memorialName}</span>
          </span>{' '}
          received your testimonial.
        </p>

        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          You may wish to include a donation to the family or continue posting your testimonial.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonOutlined
            type="button"
            variant="popup-blue"
            size="md"
            onClick={onViewMemorial}
          >
            View the memorial page
          </ButtonOutlined>
          <ButtonOutlined
            type="button"
            variant="popup-rose"
            size="md"
            onClick={onIncludeDonation}
          >
            Include donation
          </ButtonOutlined>
        </div>

        <footer className="border-t border-border pt-4">
          <p className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Secure payment via</span>
            <span className="font-display font-bold text-foreground">PayPal</span>
            <span aria-hidden="true">·</span>
            <span className="font-display font-bold text-foreground">VISA</span>
            <span aria-hidden="true">·</span>
            <span className="font-display font-bold text-foreground">Mastercard</span>
            <span aria-hidden="true">·</span>
            <span className="font-display font-bold text-foreground">Amex</span>
            <span aria-hidden="true">·</span>
            <span className="font-display font-bold text-foreground">Discover</span>
          </p>
        </footer>
      </div>
    </PopupCard>
  );
}
