import { redirect } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata = {
  title: 'Mot de passe oublié',
};

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }
  return (
    <div className="bg-mesh">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-12">
        <Card elevation="elevated" className="p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre l&apos;email associé à ton compte et nous t&apos;enverrons un lien pour
            réinitialiser ton mot de passe.
          </p>
          <ForgotPasswordForm />
          <p className="mt-6 text-center text-sm">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Retour à la connexion
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
