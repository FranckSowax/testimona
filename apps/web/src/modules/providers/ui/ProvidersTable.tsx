import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Provider } from '../schema';

/**
 * Liste admin des prestataires : catégorie, lieu, numéro et statut (exemple, vérifié, masqué).
 *
 * @example
 * <ProvidersTable providers={res.data} />
 */
export function ProvidersTable({ providers }: { providers: readonly Provider[] }) {
  const t = useTranslations('providers');
  const format = useFormatter();
  if (providers.length === 0) {
    return <p className="text-foreground">{t('admin.empty')}</p>;
  }
  const status = (p: Provider) =>
    [
      p.isExample
        ? t('admin.example')
        : p.verifiedAt
          ? t('admin.verifiedOn', {
              date: format.dateTime(new Date(p.verifiedAt), { dateStyle: 'medium' }),
            })
          : t('admin.unverified'),
      p.active ? null : t('admin.inactive'),
    ]
      .filter(Boolean)
      .join(' · ');
  return (
    <div className="overflow-x-auto">
      <table className="text-foreground w-full text-left text-sm">
        <caption className="sr-only">{t('admin.title')}</caption>
        <thead>
          <tr className="border-border border-b">
            {(['name', 'category', 'place', 'whatsapp', 'status'] as const).map((key) => (
              <th key={key} scope="col" className="py-2 pr-4 font-semibold">
                {t(`admin.${key}`)}
              </th>
            ))}
            <th scope="col" className="sr-only">
              {t('admin.editLink')}
            </th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} className="border-border border-b">
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4">{t(`category.${p.categoryKey}`)}</td>
              <td className="py-2 pr-4">{[p.city, p.district].filter(Boolean).join(', ')}</td>
              <td className="py-2 pr-4">{p.whatsapp ?? '—'}</td>
              <td className="py-2 pr-4">{status(p)}</td>
              <td className="py-2">
                <Link
                  href={`/admin/providers/${p.id}`}
                  className="text-secondary font-semibold underline"
                >
                  {t('admin.editLink')}
                  <span className="sr-only"> {p.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
