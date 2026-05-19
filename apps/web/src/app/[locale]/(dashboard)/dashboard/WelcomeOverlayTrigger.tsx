'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WelcomeOverlay } from '@/components/popups/WelcomeOverlay';

/**
 * Reads ?welcome=1 from the URL and shows the WelcomeOverlay once.
 * When the user dismisses it, the query param is stripped so the overlay
 * never re-opens on refresh or back-nav.
 */
export function WelcomeOverlayTrigger() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === '1') setOpen(true);
  }, [searchParams]);

  function close() {
    setOpen(false);
    // Remove the welcome param without forcing a full reload.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('welcome');
    const qs = params.toString();
    router.replace(qs ? `/dashboard?${qs}` : '/dashboard');
  }

  function explore() {
    close();
  }

  return <WelcomeOverlay open={open} onClose={close} onExplore={explore} />;
}
