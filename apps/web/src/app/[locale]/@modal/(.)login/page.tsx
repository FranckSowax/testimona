import Link from 'next/link';
import { Modal } from '@/components/Modal';
import { LoginForm } from '@/app/(auth)/login/LoginForm';

export default function LoginModalPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <Modal ariaLabel="Connexion">
      <h2 className="font-display text-2xl font-semibold text-foreground">Connexion</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Créer un compte
        </Link>
      </p>
      <LoginForm searchParamsPromise={searchParams} />
    </Modal>
  );
}
