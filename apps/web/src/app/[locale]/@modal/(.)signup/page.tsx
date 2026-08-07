import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Modal } from '@/components/Modal';
import { AlreadyAuthenticated } from '@/components/auth/AlreadyAuthenticated';
import { getCurrentUser } from '@/lib/supabase/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { SignupForm } from '@/app/[locale]/(auth)/signup/SignupForm';

export default async function SignupModalPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);

  // Same reasoning as the login modal: no `redirect()` from a parallel slot.
  if (user) return <AlreadyAuthenticated to={localizedPath('/dashboard', locale)} />;

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
