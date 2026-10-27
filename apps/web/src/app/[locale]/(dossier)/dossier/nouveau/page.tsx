import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { COUNTRY_CODES, parseEntryPoint } from '@/modules/dossier/schema';
import { NewDossierWizard } from '@/modules/dossier/ui/NewDossierWizard';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ porte?: string | string[] }>;
}) {
  const [{ locale }, { porte }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRY_CODES.map((code) => ({ code, label: names.of(code) ?? code }));

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <NewDossierWizard entryPoint={parseEntryPoint(porte)} countries={countries} />
    </div>
  );
}
