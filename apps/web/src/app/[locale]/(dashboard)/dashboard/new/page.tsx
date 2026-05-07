import type { Metadata } from 'next';
import { NewMemorialForm } from './NewMemorialForm';

export const metadata: Metadata = {
  title: 'Créer un mémorial',
  robots: { index: false, follow: false },
};

export default function NewMemorialPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Créer un mémorial</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Renseignez les informations principales. Vous pourrez ajouter photos, témoignages et
        biographie ensuite.
      </p>
      <NewMemorialForm />
    </div>
  );
}
