import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Modal } from '@/components/Modal';
import { AlreadyAuthenticated } from '@/components/auth/AlreadyAuthenticated';
import { getCurrentUser } from '@/lib/supabase/server';
import { loginSuccessTarget, withNextParam } from '@/lib/auth/redirect-target';
import { LoginForm } from '@/app/[locale]/(auth)/login/LoginForm';

export default async function LoginModalPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; welcome?: string; error?: string }>;
}) {
  const [user, sp, locale] = await Promise.all([getCurrentUser(), searchParams, getLocale()]);

  // Deliberately NOT `redirect()`: this page renders inside the `@modal`
  // parallel slot, and Next re-renders that slot in place right after the
  // sign-in Server Action — at which point the user *is* authenticated. A
  // redirect thrown from a slot that is already on screen crashes the client
  // router. See AlreadyAuthenticated for the details.
  if (user) return <AlreadyAuthenticated to={loginSuccessTarget(sp, locale)} />;

  return (
    <Modal ariaLabel="Connexion">
      <h2 className="font-display text-foreground text-2xl font-semibold">Connexion</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Pas encore de compte ?{' '}
        <Link href={withNextParam('/signup', sp.next)} className="text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
      <LoginForm />
    </Modal>
  );
}
