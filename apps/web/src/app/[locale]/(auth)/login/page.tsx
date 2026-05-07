import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Connexion',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    const sp = await searchParams;
    redirect(sp.next && sp.next.startsWith('/') ? sp.next : '/dashboard');
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
      <LoginForm searchParamsPromise={searchParams} />
      <p className="mt-6 text-center text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Mot de passe oublié ?
        </Link>
      </p>
    </div>
  );
}
