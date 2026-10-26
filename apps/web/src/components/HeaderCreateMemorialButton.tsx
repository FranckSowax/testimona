'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { buttonClasses } from './ui/Button';

interface Props {
  label: string;
}

export function HeaderCreateMemorialButton({ label }: Props) {
  const pathname = usePathname();
  const onMemorialsArea =
    pathname === '/dashboard' || (pathname?.startsWith('/memorial/') ?? false);

  if (!onMemorialsArea) return null;

  return (
    <Link href="/dashboard/new" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
      {label}
    </Link>
  );
}
