'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonContainer } from '@/components/ui/ButtonContainer';
import {
  MyTestimonialCreateModal,
  type TestimonialFormValues,
} from '@/components/popups/MyTestimonialCreateModal';
import { ThankYouTestimonialModal } from '@/components/popups/ThankYouTestimonialModal';
import { submitTestimonialAction } from '../actions';

/**
 * Custom event other components (the cover sidebar) can dispatch to open
 * the testimonial popup without depending on this shell's button being
 * mounted in the current tab.
 */
const OPEN_EVENT = 'testimona:open-testimonial';

interface TestimonialModalShellProps {
  memorialId: string;
  slug: string;
  memorialName: string;
  memorialCoverUrl?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  ctaLabel?: string;
}

/**
 * V2 client shell — replaces the inline TestimonialForm with a "Write a testimonial" CTA
 * that opens MyTestimonialCreateModal popup (PDF p05/p14/p20 spec).
 *
 * On success → closes the create modal + opens ThankYouTestimonialModal (PDF p15).
 */
export function TestimonialModalShell({
  memorialId,
  slug,
  memorialName,
  memorialCoverUrl,
  authorName,
  authorAvatarUrl,
  ctaLabel,
}: TestimonialModalShellProps) {
  const tActions = useTranslations('memorial.actions');
  const label = ctaLabel ?? tActions('writeTestimonial');
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => setCreateOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  async function handleSubmit(values: TestimonialFormValues) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('language', 'fr');
        fd.set('authorName', authorName);
        fd.set('message', values.message);

        const result = await submitTestimonialAction(null, fd);
        if (result?.error) {
          setError(
            result.error === 'Validation' ? tActions('checkRequiredFields') : result.error,
          );
          resolve();
          return;
        }
        if (result?.ok) {
          setCreateOpen(false);
          setThankYouOpen(true);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <ButtonContainer onClick={() => setCreateOpen(true)} type="button">
        {label}
      </ButtonContainer>
      <MyTestimonialCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        authorAvatarUrl={authorAvatarUrl}
        authorName={authorName}
        preselectedMemorial={{
          id: memorialId,
          name: memorialName,
          coverUrl: memorialCoverUrl,
        }}
        onSubmit={handleSubmit}
        submitting={pending}
      />
      <ThankYouTestimonialModal
        open={thankYouOpen}
        onClose={() => setThankYouOpen(false)}
        authorAvatarUrl={authorAvatarUrl}
        authorName={authorName}
        memorialName={memorialName}
        memorialCoverUrl={memorialCoverUrl}
        onViewMemorial={() => setThankYouOpen(false)}
        onIncludeDonation={() => {
          setThankYouOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.set('tab', 'donate');
          window.location.href = url.toString();
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
