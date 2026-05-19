import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  donationOwnerAlertEmail,
  donationReceiptEmail,
  sendEmail,
} from '@/lib/email/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe → Testimona webhook.
 *
 * Outcomes handled:
 *   - checkout.session.completed → Donation status → "Succeeded", emails out.
 *   - checkout.session.expired   → Donation status → "Failed".
 *   - charge.refunded            → Donation status → "Refunded".
 *
 * Must never throw an unhandled error (Stripe retries 5xx). Returns 400 on
 * signature failure so Stripe stops resending bad requests.
 *
 * Configure in Stripe Dashboard:
 *   Endpoint: https://<site>/api/webhooks/stripe
 *   Events:   checkout.session.completed, checkout.session.expired,
 *             charge.refunded
 * Set STRIPE_WEBHOOK_SECRET in env (matches the endpoint's signing secret).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    console.error('[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const stripe = new Stripe(secret);
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object);
        break;
      }
      case 'checkout.session.expired': {
        await handleCheckoutExpired(event.data.object);
        break;
      }
      case 'charge.refunded': {
        await handleChargeRefunded(event.data.object, stripe);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    return NextResponse.json({ error: 'handler-error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const donationId =
    session.client_reference_id ?? (session.metadata?.donationId as string | undefined);
  if (!donationId) {
    console.error('[stripe-webhook] checkout.completed without donationId', session.id);
    return;
  }

  const adminDb = getSupabaseAdminClient();

  // Idempotent: flip to Succeeded only if still pending.
  const { data: donation } = await adminDb
    .from('Donation')
    .update({ status: 'Succeeded' })
    .eq('id', donationId)
    .eq('status', 'pending')
    .select('id, memorialId, amount, currency, donorName, message')
    .maybeSingle<{
      id: string;
      memorialId: string;
      amount: number;
      currency: string;
      donorName: string | null;
      message: string | null;
    }>();

  if (!donation) return;

  // Email recipients: pull donor email from the Stripe session (we don't store
  // it on the Donation row) and the owner email from auth.users.
  const donorEmail =
    session.customer_details?.email ??
    session.customer_email ??
    (session.metadata?.donorEmail as string | undefined) ??
    null;
  const locale: 'fr' | 'en' =
    (session.metadata?.language as string | undefined) === 'en' ? 'en' : 'fr';

  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('slug, firstname, lastname, ownerId')
    .eq('id', donation.memorialId)
    .maybeSingle<{
      slug: string;
      firstname: string;
      lastname: string;
      ownerId: string;
    }>();
  if (!memorial) return;

  const memorialName = `${memorial.firstname} ${memorial.lastname}`.trim();

  if (donorEmail) {
    await sendEmail(
      donationReceiptEmail({
        to: donorEmail,
        memorialName,
        memorialSlug: memorial.slug,
        amount: donation.amount,
        currency: donation.currency,
        message: donation.message,
        locale,
      }),
    );
  }

  const { data: ownerResp } = await adminDb.auth.admin.getUserById(memorial.ownerId);
  const ownerEmail = ownerResp?.user?.email ?? null;
  if (ownerEmail) {
    await sendEmail(
      donationOwnerAlertEmail({
        to: ownerEmail,
        memorialName,
        memorialSlug: memorial.slug,
        amount: donation.amount,
        currency: donation.currency,
        donorName: donation.donorName,
        message: donation.message,
        locale,
      }),
    );
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const donationId =
    session.client_reference_id ?? (session.metadata?.donationId as string | undefined);
  if (!donationId) return;
  const adminDb = getSupabaseAdminClient();
  await adminDb
    .from('Donation')
    .update({ status: 'Failed' })
    .eq('id', donationId)
    .eq('status', 'pending');
}

async function handleChargeRefunded(charge: Stripe.Charge, stripe: Stripe) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  const donationId =
    session?.client_reference_id ??
    (session?.metadata?.donationId as string | undefined);
  if (!donationId) return;
  const adminDb = getSupabaseAdminClient();
  await adminDb.from('Donation').update({ status: 'Refunded' }).eq('id', donationId);
}
