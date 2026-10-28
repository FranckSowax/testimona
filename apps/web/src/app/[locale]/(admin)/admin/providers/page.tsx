import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { PROVIDER_CATEGORIES } from '@/modules/providers/categories';
import { listProviders } from '@/modules/providers/service';
import { ProvidersTable } from '@/modules/providers/ui/ProvidersTable';

export const metadata: Metadata = {
  title: 'Admin — Prestataires',
  robots: { index: false, follow: false },
};

const FIELD = 'border-border bg-background text-foreground rounded-xl border px-3 py-2';
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// WHY: le layout (admin) appelle requireAdmin() ; le service et la RLS revérifient le rôle.
export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = { city: one(params.city), category: one(params.category) };
  const [t, tErrors, res] = await Promise.all([
    getTranslations('providers'),
    getTranslations('dossier.errors'),
    listProviders(filters),
  ]);
  return (
    <AdminShell
      title={t('admin.title')}
      action={
        <Link href="/admin/providers/new" className={buttonClasses({ variant: 'secondary' })}>
          {t('admin.new')}
        </Link>
      }
    >
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-foreground grid gap-1 text-sm">
          {t('admin.filterCity')}
          <input name="city" defaultValue={filters.city ?? ''} maxLength={120} className={FIELD} />
        </label>
        <label className="text-foreground grid gap-1 text-sm">
          {t('admin.filterCategory')}
          <select name="category" defaultValue={filters.category ?? ''} className={FIELD}>
            <option value="">{t('admin.allCategories')}</option>
            {PROVIDER_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {t(`category.${key}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={buttonClasses({ variant: 'secondary' })}>
          {t('admin.filter')}
        </button>
      </form>
      {res.ok ? (
        <ProvidersTable providers={res.data} />
      ) : (
        <p role="alert" className="text-destructive">
          {tErrors(res.error)}
        </p>
      )}
    </AdminShell>
  );
}
