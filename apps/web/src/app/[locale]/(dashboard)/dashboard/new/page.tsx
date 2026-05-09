import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { NewMemorialModalShell } from './NewMemorialModalShell';

export const metadata: Metadata = {
  title: 'Create a memorial',
  robots: { index: false, follow: false },
};

export default async function NewMemorialPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard/new');

  return <NewMemorialModalShell />;
}
