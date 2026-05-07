import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { getCurrentUser } from '@/lib/supabase/server';
import { SignupForm } from '@/app/[locale]/(auth)/signup/SignupForm';

export default async function SignupModalPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <Modal ariaLabel="Créer un compte">
      <h2 className="font-display text-2xl font-semibold text-foreground">Créer un compte</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Déjà inscrit ?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Se connecter
        </Link>
      </p>
      <SignupForm />
    </Modal>
  );
}
