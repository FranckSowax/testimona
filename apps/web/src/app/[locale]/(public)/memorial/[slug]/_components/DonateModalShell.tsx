'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonOutlined } from '@/components/ui/ButtonOutlined';
import {
  MyDonationCreateModal,
  type DonationFormValues,
} from '@/components/popups/MyDonationCreateModal';
import { createDonationCheckoutAction } from '@/app/[locale]/(public)/donate/actions';

interface DonateModalShellProps {
  memorialId: string;
  /** Memorial's currency — preselected in the donation popup. */
  defaultCurrency?: string;
  slug: string;
  memorialName: string;
  memorialCoverUrl?: string | null;
  donorAvatarUrl?: string | null;
  donorName?: string;
  ctaLabel?: string;
  useEmbeddedPaypal?: boolean;
}

/**
 * V2 client shell — replaces the inline DonateForm with a "Make a donation" CTA
 * that opens the MyDonationCreateModal popup (PDF p16-18 spec).
 *
 * On submit success → redirects to Stripe Checkout (existing flow).
 */
export function DonateModalShell({
  memorialId,
  defaultCurrency,
  slug,
  memorialName,
  memorialCoverUrl,
  donorAvatarUrl,
  donorName,
  ctaLabel,
  useEmbeddedPaypal = false,
}: DonateModalShellProps) {
  const tActions = useTranslations('memorial.actions');
  const label = ctaLabel ?? tActions('makeDonation');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: DonationFormValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const fd = new FormData();
          fd.set('memorialId', memorialId);
          fd.set('slug', slug);
          fd.set('amount', String(values.amountCents / 100));
          fd.set('currency', values.currency);
          fd.set('language', 'fr');
          if (values.donorName) fd.set('donorName', values.donorName);
          if (values.message) fd.set('message', values.message);
          if (values.isAnonymous) fd.set('isAnonymous', '1');

          const result = await createDonationCheckoutAction(null, fd);
          if (result?.error) {
            setError(
              result.error === 'Validation' ? tActions('checkRequiredFields') : result.error,
            );
          }
          resolve();
        } catch (err) {
          throw err;
        }
      });
    });
  }

  return (
    <>
      <ButtonOutlined variant="page-gray" size="lg" onClick={() => setOpen(true)} type="button">
        {label}
      </ButtonOutlined>
      <MyDonationCreateModal
        defaultCurrency={defaultCurrency}
        open={open}
        onClose={() => setOpen(false)}
        memorialName={memorialName}
        memorialCoverUrl={memorialCoverUrl}
        donorAvatarUrl={donorAvatarUrl}
        donorName={donorName}
        useEmbeddedPaypal={useEmbeddedPaypal}
        onSubmit={handleSubmit}
        submitting={pending}
      />
      {error && (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      )}
    </>
  );
}
