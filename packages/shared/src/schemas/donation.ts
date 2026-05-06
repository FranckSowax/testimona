import { z } from 'zod';
import { LanguageCodeSchema, UuidSchema } from './common';

export const DonationStatusSchema = z.enum([
  'Canceled',
  'Processing',
  'Requires_action',
  'Requires_capture',
  'Requires_confirmation',
  'Requires_payment_method',
  'Succeeded',
]);
export type DonationStatus = z.infer<typeof DonationStatusSchema>;

export const DonationCheckoutInputSchema = z.object({
  memorialId: UuidSchema,
  amount: z.number().int().min(100).max(10_000_00),
  currency: z.enum(['EUR', 'USD', 'GBP', 'CHF']).default('EUR'),
  donorEmail: z.string().email().max(100).optional(),
  donorName: z.string().max(80).optional(),
  message: z.string().max(500).optional(),
  language: LanguageCodeSchema,
});
export type DonationCheckoutInput = z.infer<typeof DonationCheckoutInputSchema>;

export const StripeWebhookEnvelopeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.unknown() }),
  livemode: z.boolean(),
  created: z.number(),
});
