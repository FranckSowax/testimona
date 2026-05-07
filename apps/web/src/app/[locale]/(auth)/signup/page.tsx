import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Créer un compte' };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Créer un compte</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Déjà inscrit ?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Se connecter
        </Link>
      </p>
      <SignupForm />
    </div>
  );
}
