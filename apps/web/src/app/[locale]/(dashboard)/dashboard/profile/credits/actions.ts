'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { addCredits, findPack } from '@/lib/credits/balance';

export interface BuyCreditsActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Demo purchase — instantly credits the pack to the user. When real Stripe
 * is wired up, this action will create a Checkout Session and redirect to
 * Stripe instead; the actual credit insert moves to the webhook handler.
 */
export async function buyCreditsDemoAction(
  _prev: BuyCreditsActionState | null,
  formData: FormData,
): Promise<BuyCreditsActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Non connecté.' };

  const packId = String(formData.get('packId') ?? '').trim();
  const pack = findPack(packId);
  if (!pack) return { error: 'Pack inconnu.' };

  const result = await addCredits(user.id, pack.credits, {
    type: 'demo_grant',
    note: `Demo: pack ${pack.label} (${pack.credits} crédits)`,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath('/dashboard/profile/credits');
  revalidatePath('/dashboard/profile');
  revalidatePath('/');
  return { ok: true };
}

/**
 * Stripe Checkout entrypoint. Wired-but-disabled — falls back to demo when
 * STRIPE_SECRET_KEY is missing. Keeping it here so swapping to real payments
 * is a one-file change.
 */
export async function startStripeCheckoutAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const packId = String(formData.get('packId') ?? '').trim();
  const pack = findPack(packId);
  if (!pack) redirect('/dashboard/profile/credits?error=pack');

  if (!process.env.STRIPE_SECRET_KEY) {
    // Demo path
    await addCredits(user.id, pack.credits, {
      type: 'demo_grant',
      note: `Demo (no Stripe): pack ${pack.label}`,
    });
    revalidatePath('/dashboard/profile/credits');
    redirect('/dashboard/profile/credits?ok=1');
  }

  // TODO real Stripe: create Checkout Session + redirect
  redirect('/dashboard/profile/credits?error=stripe_not_configured');
}
