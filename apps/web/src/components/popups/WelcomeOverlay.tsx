'use client';

import Image from 'next/image';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import { OverlayModal } from './OverlayModal';

interface WelcomeOverlayProps {
  open: boolean;
  onClose: () => void;
  onExplore: () => void;
}

/**
 * V2 Welcome modal post-signup (PDF p13).
 * Spec : full navy + "Thank you!" Debby teal géant + "You're now a member..." Bold.
 */
export function WelcomeOverlay({ open, onClose, onExplore }: WelcomeOverlayProps) {
  return (
    <OverlayModal open={open} onClose={onClose} ariaLabel="Welcome to Testimona">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="flex justify-center">
          <Image
            src="/images/dove.svg"
            alt=""
            width={120}
            height={120}
            className="h-24 w-auto opacity-90"
            priority
          />
        </div>

        <h2 className="relative inline-block">
          <span
            className="inline-block -rotate-2 text-7xl text-[var(--color-primary-soft)] sm:text-8xl"
            style={{ fontFamily: 'var(--font-cursive)' }}
          >
            Thank you!
          </span>
        </h2>

        <p className="font-display text-2xl font-bold text-white sm:text-3xl">
          You&apos;re now a member of the Testimona community!
        </p>

        <p className="mx-auto max-w-xl text-base leading-relaxed text-white/90">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonOutlined
            type="button"
            variant="thankyou-gray"
            size="lg"
            onClick={onClose}
            className="!border-white/40 !text-white hover:!bg-white/10"
          >
            Back to Home page
          </ButtonOutlined>
          <ButtonOutlined type="button" variant="popup-rose" size="lg" onClick={onExplore}>
            Explore Testimona
          </ButtonOutlined>
        </div>
      </div>
    </OverlayModal>
  );
}
