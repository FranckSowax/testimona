import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Créer un compte' };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect('/dashboard');
  return (
    <div className="bg-mesh">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-12">
        <Card elevation="elevated" className="p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Créer un compte
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
          <SignupForm />
        </Card>
      </div>
    </div>
  );
}
