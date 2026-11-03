import { Image, View } from '@react-pdf/renderer';

interface PdfPhotoProps {
  /** Octets JPEG de la photo (sans métadonnées, cf. `stripJpegMetadata`). */
  photo: Uint8Array;
  width: number;
  height: number;
  borderColor: string;
}

/**
 * Photo du défunt dans un cadre fixe, recadrée sans déformation.
 * WHY: le cadre a une taille fixe pour que la mise en page ne dépende pas des proportions de la
 * photo envoyée ; `objectFit: 'cover'` la recadre au centre.
 *
 * @example
 * <PdfPhoto photo={bytes} width={180} height={225} borderColor={theme.rule} />
 */
export function PdfPhoto({ photo, width, height, borderColor }: PdfPhotoProps) {
  // WHY: vue sur les mêmes octets, sans copie (la photo peut peser plusieurs centaines de Ko).
  const data = Buffer.from(photo.buffer, photo.byteOffset, photo.byteLength);
  return (
    <View style={{ width, height, borderWidth: 1, borderColor, padding: 3 }}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, sans attribut alt */}
      <Image
        src={{ data, format: 'jpg' }}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </View>
  );
}
