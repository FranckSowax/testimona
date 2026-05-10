'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ButtonText } from '@/components/ui/ButtonText';
import {
  BiographyEditPopup,
  type BiographyInfoValues,
} from '@/components/popups/BiographyModals';
import { FuneralsEditPopup } from '@/components/popups/FuneralsModals';
import {
  DonationsEditModal,
  type DonationsEditValues,
} from '@/components/popups/DonationsEditModal';
import { MemorialAdminRequestPopup } from '@/components/popups/MemorialAdminModals';
import {
  updateBiographyInfoAction,
  updateFuneralInfoAction,
  updateDonationsConfigAction,
  requestAdminAction,
} from '../_actions/admin';

// =============================================================================
// BiographyEditModalShell
// =============================================================================
export function BiographyEditModalShell({
  memorialId,
  slug,
  initial,
}: {
  memorialId: string;
  slug: string;
  initial: Partial<BiographyInfoValues>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(values: BiographyInfoValues) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        Object.entries(values).forEach(([k, v]) => {
          if (v) fd.set(k, v);
        });
        const result = await updateBiographyInfoAction(null, fd);
        if (result?.ok) {
          setOpen(false);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <ButtonText variant="action" type="button" onClick={() => setOpen(true)}>
        Edit biography
      </ButtonText>
      <BiographyEditPopup
        open={open}
        onClose={() => setOpen(false)}
        initial={initial}
        onSubmit={handleSubmit}
        submitting={pending}
      />
    </>
  );
}

// =============================================================================
// FuneralsEditModalShell
// =============================================================================
export function FuneralsEditModalShell({
  memorialId,
  slug,
  initial = '',
}: {
  memorialId: string;
  slug: string;
  initial?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(info: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('description', info);
        const result = await updateFuneralInfoAction(null, fd);
        if (result?.ok) {
          setOpen(false);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <ButtonText variant="action" type="button" onClick={() => setOpen(true)}>
        Edit funeral info
      </ButtonText>
      <FuneralsEditPopup
        open={open}
        onClose={() => setOpen(false)}
        initial={initial}
        onSubmit={handleSubmit}
        submitting={pending}
      />
    </>
  );
}

// =============================================================================
// DonationsEditModalShell
// =============================================================================
export function DonationsEditModalShell({
  memorialId,
  slug,
  memorialName,
  memorialCoverUrl,
  initial,
}: {
  memorialId: string;
  slug: string;
  memorialName: string;
  memorialCoverUrl?: string | null;
  initial?: Partial<DonationsEditValues>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(values: DonationsEditValues) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('about', values.about);
        fd.set('goalAmount', values.goalAmount);
        fd.set('currency', values.currency);
        const result = await updateDonationsConfigAction(null, fd);
        if (result?.ok) {
          setOpen(false);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <ButtonText variant="action" type="button" onClick={() => setOpen(true)}>
        Edit donations
      </ButtonText>
      <DonationsEditModal
        open={open}
        onClose={() => setOpen(false)}
        memorialName={memorialName}
        memorialCoverUrl={memorialCoverUrl}
        initial={initial}
        onSubmit={handleSubmit}
        submitting={pending}
      />
    </>
  );
}

// =============================================================================
// AdminRequestModalShell
// =============================================================================
export function AdminRequestModalShell({
  memorialId,
  slug,
}: {
  memorialId: string;
  slug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(values: { relationship: string; note: string }) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const fd = new FormData();
        fd.set('memorialId', memorialId);
        fd.set('slug', slug);
        fd.set('relationship', values.relationship);
        fd.set('note', values.note);
        const result = await requestAdminAction(null, fd);
        if (result?.ok) {
          setOpen(false);
          setSubmitted(true);
          router.refresh();
        }
        resolve();
      });
    });
  }

  return (
    <>
      <ButtonText
        variant="action"
        type="button"
        onClick={() => setOpen(true)}
        disabled={submitted}
      >
        {submitted ? 'Request sent' : 'Be an admin'}
      </ButtonText>
      <MemorialAdminRequestPopup
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
        submitting={pending}
      />
    </>
  );
}
