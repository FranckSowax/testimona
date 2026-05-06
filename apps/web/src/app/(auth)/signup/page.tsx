import Link from 'next/link';
import { SignupForm } from './SignupForm';

export const metadata = { title: 'Créer un compte' };

export default function SignupPage() {
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
