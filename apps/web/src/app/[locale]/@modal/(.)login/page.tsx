import { Link } from '@/i18n/navigation';
import { redirect } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { getCurrentUser } from '@/lib/supabase/server';
import { LoginForm } from '@/app/[locale]/(auth)/login/LoginForm';

export default async function LoginModalPage({
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
    <Modal ariaLabel="Connexion">
      <h2 className="font-display text-2xl font-semibold text-foreground">Connexion</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
      <LoginForm />
    </Modal>
  );
}
