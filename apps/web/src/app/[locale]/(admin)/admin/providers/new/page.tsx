import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { Link } from '@/i18n/navigation';
import { ProviderForm } from '@/modules/providers/ui/ProviderForm';

export const metadata: Metadata = {
  title: 'Admin — Nouveau prestataire',
  robots: { index: false, follow: false },
};

export default async function AdminNewProviderPage() {
  const t = await getTranslations('providers.admin');
  return (
    <AdminShell title={t('new')}>
      <p className="mb-6">
        <Link href="/admin/providers" className="text-secondary font-semibold underline">
          {t('back')}
        </Link>
      </p>
      <ProviderForm />
    </AdminShell>
  );
}
