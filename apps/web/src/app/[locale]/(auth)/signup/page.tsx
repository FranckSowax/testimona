import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { Card } from '@/components/ui/Card';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Créer un compte' };

export default async function SignupPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  if (user) redirect(localizedPath('/dashboard', locale));
  return (
    <div className="bg-mesh">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-6 py-12">
        <Card elevation="elevated" className="p-8">
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">
            Créer un compte
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
          <SignupForm />
        </Card>
      </div>
    </div>
  );
}
