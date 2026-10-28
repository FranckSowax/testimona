/** Plus grand côté, en pixels, d'une photo de reçu envoyée après réduction. */
export const SHRINK_MAX_SIDE = 1600;

const JPEG_QUALITY = 0.85;

/** Dimensions visées par la réduction. */
export interface ShrinkTarget {
  width: number;
  height: number;
}

/** Image décodée par le navigateur, prête à être redessinée. */
export interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource;
  close: () => void;
}

/** Décodage et encodage d'image ; remplaçables dans les tests (jsdom n'a pas de vrai canvas). */
export interface ShrinkEnv {
  decode: (file: File) => Promise<DecodedImage>;
  encode: (image: DecodedImage, target: ShrinkTarget) => Promise<Blob | null>;
}

/**
 * Dimensions visées : 1600 px au plus pour le plus grand côté, sans jamais agrandir ; null quand
 * les dimensions sont illisibles (la photo part alors telle quelle).
 * WHY: une photo de téléphone (4000 px, 4 à 8 Mo) dépasse souvent la limite de lecture de l'IA
 * (`RECEIPT_AI_MAX_BYTES`, 3,5 Mio) ; 1600 px suffisent pour lire un reçu. Une photo déjà petite
 * garde ses dimensions mais est quand même réencodée (voir `shrinkImage`).
 *
 * @example
 * shrinkTarget(4000, 3000); // { width: 1600, height: 1200 }
 */
export function shrinkTarget(width: number, height: number): ShrinkTarget | null {
  const side = Math.max(width, height);
  if (!(side > 0)) return null;
  const scale = Math.min(1, SHRINK_MAX_SIDE / side);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeInBrowser(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    // WHY: redresse une photo de téléphone selon son orientation EXIF.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      close: () => bitmap.close(),
    };
  }
  // WHY: anciennes WebViews sans `createImageBitmap` : décodage par un élément image.
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('decode'));
      img.src = url;
    });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    source: img,
    close: () => URL.revokeObjectURL(url),
  };
}

function encodeInBrowser(image: DecodedImage, target: ShrinkTarget): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  // WHY: le JPEG n'a pas de transparence ; un PNG transparent deviendrait noir.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.drawImage(image.source, 0, 0, target.width, target.height);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        // WHY: libère tout de suite la mémoire du canvas (téléphones modestes).
        canvas.width = 0;
        canvas.height = 0;
        resolve(blob);
      },
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

const BROWSER: ShrinkEnv = { decode: decodeInBrowser, encode: encodeInBrowser };

const jpegName = (name: string) => `${name.replace(/\.[^./]*$/, '') || 'receipt'}.jpg`;

/**
 * Réencode toujours une photo de reçu dans le navigateur avant l'envoi : JPEG (qualité 0,85),
 * 1600 px au plus.
 * WHY: le réencodage par canvas retire les métadonnées de la photo (EXIF, dont la position GPS
 * où elle a été prise), même quand elle est déjà petite et légère : le reçu est visible des
 * membres du dossier, sa position ne doit pas l'être. Il garde aussi la photo sous la limite de
 * lecture de l'IA et allège l'envoi sur un réseau mobile lent. L'original n'est envoyé que si le
 * réencodage échoue (navigateur, format non décodable) : le serveur le refusera proprement s'il
 * dépasse 5 Mo ou n'est pas une image permise.
 *
 * @example
 * const toSend = await shrinkImage(file);
 */
export async function shrinkImage(file: File, env: ShrinkEnv = BROWSER): Promise<File> {
  let image: DecodedImage | null = null;
  try {
    image = await env.decode(file);
    const target = shrinkTarget(image.width, image.height);
    if (!target) return file;
    const blob = await env.encode(image, target);
    // WHY: seul un encodage raté (absent, vide ou d'un autre type) fait garder l'original ; un
    // JPEG un peu plus lourd que l'original est préféré, car il est sans métadonnées.
    if (!blob || blob.type !== 'image/jpeg' || blob.size === 0) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    image?.close();
  }
}
