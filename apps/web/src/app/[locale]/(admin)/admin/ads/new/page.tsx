import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/supabase/admin';
import { AdForm } from '../AdForm';

export const metadata: Metadata = {
  title: 'Admin — New ad',
  robots: { index: false, follow: false },
};

export default async function AdminAdNewPage() {
  await requireAdmin();
  const [t, tNav] = await Promise.all([
    getTranslations('admin.ads'),
    getTranslations('admin.nav'),
  ]);
  const labels = {
    name: t('form.name'),
    slot: t('form.slot'),
    type: t('form.type'),
    typeImage: t('form.typeImage'),
    typeHtml: t('form.typeHtml'),
    imageUrl: t('form.imageUrl'),
    imageUrlHint: t('form.imageUrlHint'),
    targetUrl: t('form.targetUrl'),
    targetUrlHint: t('form.targetUrlHint'),
    html: t('form.html'),
    htmlHint: t('form.htmlHint'),
    startsAt: t('form.startsAt'),
    expiresAt: t('form.expiresAt'),
    isActive: t('form.isActive'),
    save: t('form.save'),
    saving: t('form.saving'),
  };

  return (
    <AdminShell title={t('newTitle')}>
      <p className="mb-6 text-sm">
        <Link href="/admin/ads" className="font-display font-bold text-primary hover:underline">
          ← {tNav('ads')}
        </Link>
      </p>
      <AdForm labels={labels} />
    </AdminShell>
  );
}
