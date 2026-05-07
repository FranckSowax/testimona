'use server';

import { DonationCheckoutInputSchema } from '@testimona/shared';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { getSupabaseServer } from '@/lib/supabase/server';

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
  if (!customerEmail) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) customerEmail = data.user.email;
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
      metadata: {
        memorialId: parsed.data.memorialId,
        language: parsed.data.language,
        donorName: parsed.data.donorName ?? '',
      },
      success_url: `${siteUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}&slug=${encodeURIComponent(slug)}`,
      cancel_url: `${siteUrl}/donate/cancel?slug=${encodeURIComponent(slug)}`,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur Stripe' };
  }

  if (!session.url) return { error: "Stripe n'a pas retourné d'URL." };
  redirect(session.url);
}
