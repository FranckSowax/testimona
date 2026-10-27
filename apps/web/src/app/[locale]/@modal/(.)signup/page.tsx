import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Modal } from '@/components/Modal';
import { AlreadyAuthenticated } from '@/components/auth/AlreadyAuthenticated';
import { getCurrentUser } from '@/lib/supabase/server';
import { loginSuccessTarget, withNextParam } from '@/lib/auth/redirect-target';
import { SignupForm } from '@/app/[locale]/(auth)/signup/SignupForm';

export default async function SignupModalPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, locale, sp] = await Promise.all([getCurrentUser(), getLocale(), searchParams]);

  // Same reasoning as the login modal: no `redirect()` from a parallel slot.
  if (user) return <AlreadyAuthenticated to={loginSuccessTarget({ next: sp.next }, locale)} />;

  return (
    <Modal ariaLabel="Créer un compte">
      <h2 className="font-display text-foreground text-2xl font-semibold">Créer un compte</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Déjà inscrit ?{' '}
        <Link href={withNextParam('/login', sp.next)} className="text-primary hover:underline">
          Se connecter
        </Link>
      </p>
      <SignupForm />
    </Modal>
  );
}
