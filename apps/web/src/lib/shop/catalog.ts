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
  /**
   * Optional fal-kontext prompt suffix used to mock the source visual
   * onto this product (e-commerce style). When undefined, no mockup
   * is generated and the shop falls back to displaying the bare
   * visual.
   */
  mockupPromptSuffix?: string;
}

// Common preamble for every mockup prompt — tells Kontext to preserve
// the source visual verbatim and only paint the product around it.
const MOCKUP_PROMPT_COMMON =
  'Use this image AS-IS, perfectly intact — do not modify colors, ' +
  'composition or details. Generate the product around it. ';

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'tshirt',
    name: 'T-shirt commémoratif',
    description: 'Coton imprimé avec le visuel du défunt, taille XS à XXL.',
    category: 'apparel',
    defaultPriceCents: 1900,
    iconKey: 'tshirt',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Place this image centered on the chest of a plain white cotton t-shirt as a printed graphic. Studio product photography on a clean white background, soft even lighting, gentle natural shadow. Front view, garment laid flat or on an invisible mannequin. E-commerce catalog mockup.',
  },
  {
    id: 'cap',
    name: 'Casquette',
    description: 'Casquette brodée avec portrait, taille unique ajustable.',
    category: 'apparel',
    defaultPriceCents: 1500,
    iconKey: 'cap',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Place this image on the front panel of a plain white baseball cap as an embroidered patch. Studio product photo on a clean white background, soft light, three-quarter front view of the cap. E-commerce mockup style.',
  },
  {
    id: 'pagne',
    name: 'Pagne',
    description: 'Tissu traditionnel 2m × 1,2m, motif personnalisé.',
    category: 'apparel',
    defaultPriceCents: 4500,
    iconKey: 'fabric',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Print this image as the central motif on a draped white pagne fabric (traditional West African cloth) folded elegantly on a white surface. Studio product photo, soft natural light, subtle fabric texture and folds visible. E-commerce mockup.',
  },
  {
    id: 'fan',
    name: 'Éventail',
    description: 'Éventail en papier avec photo + nom, distribué aux invités.',
    category: 'paper',
    defaultPriceCents: 350,
    iconKey: 'fan',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Print this image at the center of an open white paper folding fan with wooden ribs, held against a clean white background. Studio product photo, soft shadow. E-commerce mockup.',
  },
  {
    id: 'vigil-card',
    name: 'Carte de veille',
    description: 'Carte imprimée avec photo, dates et message personnel.',
    category: 'paper',
    defaultPriceCents: 250,
    iconKey: 'card',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Print this image on a small portrait-orientation memorial card with a thin elegant white border, lying flat on a clean white surface. Studio product photo, soft natural shadow.',
  },
  {
    id: 'digital-card',
    name: 'Carte de veille digitale',
    description: 'Carte numérique à partager par SMS, WhatsApp, email.',
    category: 'digital',
    defaultPriceCents: 0,
    iconKey: 'digital',
    // No mockup — the visual IS the digital card.
  },
  {
    id: 'banner',
    name: 'Banderole / bâche',
    description: 'Bâche grand format 3m × 1m pour la cérémonie.',
    category: 'banner',
    defaultPriceCents: 8900,
    iconKey: 'banner',
    mockupPromptSuffix:
      MOCKUP_PROMPT_COMMON +
      'Print this image centered on a large horizontal white vinyl banner with thin black grommets at the corners, hung against a clean white wall. Studio product photo, slight natural drape, soft shadow. E-commerce catalog mockup.',
  },
  {
    id: 'casket',
    name: 'Cercueil',
    description: 'Cercueil bois, livré par notre réseau de partenaires.',
    category: 'partner',
    defaultPriceCents: 95000,
    iconKey: 'casket',
    partner: true,
    // Partner products are coordinated manually; no mockup generated.
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
