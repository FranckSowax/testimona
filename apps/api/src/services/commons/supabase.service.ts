/**
 * Supabase admin client for server-side operations from the BFF.
 *
 * Uses the SERVICE_ROLE key — bypasses RLS. NEVER expose to the browser.
 * The frontend calls Supabase directly with the ANON key (subject to RLS).
 *
 * Used for:
 *  - User provisioning during the bcrypt -> Supabase Auth migration
 *  - Stripe webhook handler (server-only writes to "Donation")
 *  - Admin batch operations
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import logger from './logger.service';

let _instance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_instance) return _instance;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    logger.warn('Supabase admin not configured', {
      hasUrl: Boolean(url),
      hasServiceKey: Boolean(serviceKey),
    });
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use the Supabase admin client',
    );
  }

  _instance = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-client-info': 'testimona-api/2.0' },
    },
  });

  return _instance;
}

/**
 * Returns true when Supabase env is configured. Used by /health to gate the
 * Supabase check so it does not fail builds prior to Phase 3.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}
