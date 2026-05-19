/**
 * Hard-coded catalog of products the memorial shop can offer. Each entry
 * has a stable id (stored on MemorialShopItem.productId), a category,
 * a default unit price (admin can override per memorial), and an SVG
 * icon name from the heroicons / custom set.
 *
 * Categories:
 *   apparel     — Wearables (t-shirt, cap, pagne)
 *   paper       — Printed cards / fans
 *   digital     — Online assets (digital cards)
 *   banner      — Large-format banners / signs
 *   partner     — Heavy-fulfilment items via partner network
 */

export type ShopProductCategory =
  | 'apparel'
  | 'paper'
  | 'digital'
  | 'banner'
  | 'partner';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ShopProductCategory;
  defaultPriceCents: number;
  iconKey:
    | 'tshirt'
    | 'cap'
    | 'fan'
    | 'card'
    | 'banner'
    | 'fabric'
    | 'casket'
    | 'stone'
    | 'crown'
    | 'digital';
  /** Marks partner-fulfilled items that need an extra contact step. */
  partner?: boolean;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'tshirt',
    name: 'T-shirt commémoratif',
    description: 'Coton imprimé avec le visuel du défunt, taille XS à XXL.',
    category: 'apparel',
    defaultPriceCents: 1900,
    iconKey: 'tshirt',
  },
  {
    id: 'cap',
    name: 'Casquette',
    description: 'Casquette brodée avec portrait, taille unique ajustable.',
    category: 'apparel',
    defaultPriceCents: 1500,
    iconKey: 'cap',
  },
  {
    id: 'pagne',
    name: 'Pagne',
    description: 'Tissu traditionnel 2m × 1,2m, motif personnalisé.',
    category: 'apparel',
    defaultPriceCents: 4500,
    iconKey: 'fabric',
  },
  {
    id: 'fan',
    name: 'Éventail',
    description: 'Éventail en papier avec photo + nom, distribué aux invités.',
    category: 'paper',
    defaultPriceCents: 350,
    iconKey: 'fan',
  },
  {
    id: 'vigil-card',
    name: 'Carte de veille',
    description: 'Carte imprimée avec photo, dates et message personnel.',
    category: 'paper',
    defaultPriceCents: 250,
    iconKey: 'card',
  },
  {
    id: 'digital-card',
    name: 'Carte de veille digitale',
    description: 'Carte numérique à partager par SMS, WhatsApp, email.',
    category: 'digital',
    defaultPriceCents: 0,
    iconKey: 'digital',
  },
  {
    id: 'banner',
    name: 'Banderole / bâche',
    description: 'Bâche grand format 3m × 1m pour la cérémonie.',
    category: 'banner',
    defaultPriceCents: 8900,
    iconKey: 'banner',
  },
  {
    id: 'casket',
    name: 'Cercueil',
    description: 'Cercueil bois, livré par notre réseau de partenaires.',
    category: 'partner',
    defaultPriceCents: 95000,
    iconKey: 'casket',
    partner: true,
  },
  {
    id: 'headstone',
    name: 'Pierre tombale',
    description: 'Pierre gravée avec portrait et inscription, sur mesure.',
    category: 'partner',
    defaultPriceCents: 150000,
    iconKey: 'stone',
    partner: true,
  },
  {
    id: 'tomb',
    name: 'Tombeau',
    description: 'Construction complète, partenaires marbriers locaux.',
    category: 'partner',
    defaultPriceCents: 350000,
    iconKey: 'crown',
    partner: true,
  },
];

export const PRODUCT_INDEX = new Map(SHOP_PRODUCTS.map((p) => [p.id, p]));

export function findProduct(id: string): ShopProduct | undefined {
  return PRODUCT_INDEX.get(id);
}

export const CATEGORY_LABEL: Record<ShopProductCategory, string> = {
  apparel: 'Vêtements & accessoires',
  paper: 'Cartes & papier',
  digital: 'Numérique',
  banner: 'Banderoles & signalétique',
  partner: 'Partenaires',
};
