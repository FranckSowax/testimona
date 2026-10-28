import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';
import { getProvider } from '@/modules/providers/service';
import { ProviderForm } from '@/modules/providers/ui/ProviderForm';

export const metadata: Metadata = {
  title: 'Admin — Prestataire',
  robots: { index: false, follow: false },
};

export default async function AdminProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, tErrors, res] = await Promise.all([
    getTranslations('providers.admin'),
    getTranslations('dossier.errors'),
    getProvider(id),
  ]);
  if (!res.ok && res.error === 'not_found') notFound();
  return (
    <AdminShell title={t('edit')}>
      <p className="mb-6">
        <Link href="/admin/providers" className="text-secondary font-semibold underline">
          {t('back')}
        </Link>
      </p>
      {res.ok ? (
        <ProviderForm provider={res.data} />
      ) : (
        <p role="alert" className="text-destructive">
          {tErrors(res.error)}
        </p>
      )}
    </AdminShell>
  );
}
