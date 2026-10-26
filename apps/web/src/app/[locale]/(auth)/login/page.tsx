import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { loginSuccessTarget } from '@/lib/auth/redirect-target';
import { Card } from '@/components/ui/Card';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Connexion',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; welcome?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    const [sp, locale] = await Promise.all([searchParams, getLocale()]);
    // Localised on purpose: a bare `/dashboard` here dropped English visitors
    // back onto the French tree. `welcome=1` is carried over so the overlay
    // still fires when signup hands off to this page.
    redirect(loginSuccessTarget(sp, locale));
  }
  return (
    <div className="bg-mesh">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-6 py-12">
        <Card elevation="elevated" className="p-8">
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            Connexion
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
