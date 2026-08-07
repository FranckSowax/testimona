'use server';

import { randomUUID } from 'node:crypto';
import { DonationCheckoutInputSchema } from '@testimona/shared';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';
import { revalidateMemorialPages } from '@/lib/revalidate';

export interface DonationActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createDonationCheckoutAction(
  _prev: DonationActionState | null,
  formData: FormData,
): Promise<DonationActionState> {
  const amountCents = Math.round(Number.parseFloat(String(formData.get('amount') ?? '0')) * 100);

  const raw = {
    memorialId: String(formData.get('memorialId') ?? ''),
    amount: amountCents,
    currency: String(formData.get('currency') ?? 'EUR'),
    donorName: formData.get('donorName') ? String(formData.get('donorName')).trim() : undefined,
    donorEmail: formData.get('donorEmail') ? String(formData.get('donorEmail')).trim() : undefined,
    message: formData.get('message') ? String(formData.get('message')).trim() : undefined,
    language: String(formData.get('language') ?? 'fr'),
  };

  const parsed = DonationCheckoutInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const slug = String(formData.get('slug') ?? '');
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return { error: 'Service de paiement indisponible.' };

  const stripe = new Stripe(secret);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  let customerEmail = parsed.data.donorEmail;
  let donorUserId: string | null = null;
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    donorUserId = userData.user.id;
    if (!customerEmail && userData.user.email) customerEmail = userData.user.email;
  }

  // Persist the Donation in `pending` BEFORE redirecting to Stripe so the
  // webhook can flip it to `Succeeded` by id (passed via client_reference_id).
  // Use the service-role client so the insert succeeds for anonymous donors
  // even though RLS would otherwise block them.
  const adminDb = getSupabaseAdminClient();
  const insertPayload: Record<string, unknown> = {
    id: randomUUID(),
    memorialId: parsed.data.memorialId,
    amount: parsed.data.amount,
    currency: parsed.data.currency.toUpperCase(),
    status: 'pending',
  };
  if (donorUserId) insertPayload.donorId = donorUserId;
  if (parsed.data.donorName) insertPayload.donorName = parsed.data.donorName;
  if (parsed.data.message) insertPayload.message = parsed.data.message;
  // Not part of the Zod schema (like `slug` below) — read straight off the
  // form. Only hides the name on public lists; the owner still sees it.
  if (String(formData.get('isAnonymous') ?? '') === '1') insertPayload.isAnonymous = true;
  const { data: donation, error: insertErr } = await adminDb
    .from('Donation')
    .insert(insertPayload)
    .select('id')
    .single<{ id: string }>();
  if (insertErr || !donation) {
    return { error: insertErr?.message ?? "Impossible d'enregistrer le don." };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: parsed.data.currency.toLowerCase(),
            unit_amount: parsed.data.amount,
            product_data: {
              name: 'Don en hommage',
              description: parsed.data.message?.slice(0, 200),
            },
          },
        },
      ],
      customer_email: customerEmail,
      client_reference_id: donation.id,
      metadata: {
        donationId: donation.id,
        memorialId: parsed.data.memorialId,
        memorialSlug: slug,
        language: parsed.data.language,
        donorName: parsed.data.donorName ?? '',
        donorEmail: customerEmail ?? '',
      },
      success_url: `${siteUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(slug)}`,
      cancel_url: `${siteUrl}/donate/cancel?slug=${encodeURIComponent(slug)}`,
    });
  } catch (err) {
    await adminDb.from('Donation').delete().eq('id', donation.id);
    return { error: err instanceof Error ? err.message : 'Erreur Stripe' };
  }

  if (!session.url) return { error: "Stripe n'a pas retourné d'URL." };
  redirect(session.url);
}

// ---------------------------------------------------------------------------
// Test donation — owner/admin only. Inserts a Succeeded donation directly,
// bypassing Stripe, so the memorial owner can see how the pot credits and how
// different currencies behave (there is currently NO FX conversion: the pot
// sums raw amounts across currencies — see DonationGoal). For testing only.
// ---------------------------------------------------------------------------
export interface SimulateDonationState {
  ok?: boolean;
  error?: string;
}

export async function simulateDonationAction(
  _prev: SimulateDonationState | null,
  formData: FormData,
): Promise<SimulateDonationState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const amountUnits = Number(formData.get('amount') ?? 0);
  const currency = String(formData.get('currency') ?? 'EUR').trim().toUpperCase();
  const donorName = String(formData.get('donorName') ?? '').trim() || 'Donateur test';
  if (!memorialId) return { error: 'memorialId requis.' };
  // Same ceiling as the real Stripe checkout (DonationCheckoutInputSchema caps
  // at 10 000 in cents) — without it an owner could inflate the public pot
  // with an arbitrarily huge fake "Succeeded" donation.
  if (!Number.isFinite(amountUnits) || amountUnits <= 0 || amountUnits > 10_000)
    return { error: 'Montant invalide (1 à 10 000).' };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: 'Devise invalide.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };
  if (!(await canManageMemorial(memorialId, userData.user.id)))
    return { error: 'Réservé aux administrateurs du mémorial.' };

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb.from('Donation').insert({
    id: randomUUID(),
    memorialId,
    amount: Math.round(amountUnits * 100),
    currency,
    status: 'Succeeded',
    donorId: userData.user.id,
    donorName: `${donorName} (test)`,
    message: 'Don de test — simulation sans paiement.',
  });
  if (error) return { error: error.message };

  if (slug) revalidateMemorialPages(slug);
  return { ok: true };
}
