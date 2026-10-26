import type { ShopProduct } from '@/lib/shop/catalog';

/**
 * Inline SVG icons keyed by ShopProduct.iconKey. Keeps the catalog
 * server-component-friendly (no client component needed) and avoids
 * shipping an icon library.
 */
const PATHS: Record<ShopProduct['iconKey'], string> = {
  tshirt: 'M7 4l-3 2 2 4h2v10h8V10h2l2-4-3-2-3 2h-4z',
  cap: 'M3 18c0-5 4-9 9-9s9 4 9 9v2H3zM21 14h-2',
  fan: 'M12 22 V8 M12 8c-4 0-6 3-7 5 M12 8c-2-2-3-4-3-6 M12 8c2-2 3-4 3-6 M12 8c4 0 6 3 7 5',
  card: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm4 3h3m-3 4h6',
  banner: 'M4 3v18 M20 5L8 5v6h12zM8 11l4 3',
  fabric: 'M4 4h16v4H4zm0 6h16v4H4zm0 6h16v4H4z M8 4v16 M16 4v16',
  casket: 'M5 6l2-2h10l2 2v14H5z M9 4v16 M15 4v16',
  stone: 'M6 22V8a6 6 0 0 1 12 0v14z M10 14h4 M10 18h4',
  crown: 'M3 9l4 5 5-7 5 7 4-5v9H3z',
  digital: 'M2 6h20v10H2z M7 19h10 M12 16v3',
};

interface Props {
  iconKey: ShopProduct['iconKey'];
  className?: string;
}

export function ShopProductIcon({ iconKey, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[iconKey]} />
    </svg>
  );
}
