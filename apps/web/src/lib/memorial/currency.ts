import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * The memorial's currency (admin donation setting) — drives how the WHOLE
 * memorial displays money: donation goal, donate modal default, shop prices.
 * Tolerant of the column not existing; defaults to EUR.
 */
export async function getMemorialCurrency(memorialId: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from('Memorial')
    .select('donationCurrency')
    .eq('id', memorialId)
    .maybeSingle<{ donationCurrency: string | null }>();
  return data?.donationCurrency || 'EUR';
}
