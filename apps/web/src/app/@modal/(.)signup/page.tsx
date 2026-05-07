import Link from 'next/link';
import { Modal } from '@/components/Modal';
import { SignupForm } from '@/app/(auth)/signup/SignupForm';

export default function SignupModalPage() {
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
