import { FONT_FAMILY } from '../fonts';
import type { PosterData } from '../model';
import { DOCUMENT_THEMES } from '../theme';

interface PosterImageProps {
  data: PosterData;
}

/** Côté de l'affiche carrée, en pixels : format recommandé pour une image WhatsApp. */
export const POSTER_IMAGE_SIZE = 1080;

const PHOTO = { width: 300, height: 375 } as const;

/**
 * Coupe un texte après `lines` lignes, avec des points de suspension.
 * WHY: Satori ne sait pas mesurer ce qui tient dans le carré ; borner chaque texte garantit que
 * les cinq moments restent visibles même avec des textes de 200 caractères.
 */
function _clamp(lines: number) {
  return { display: 'block', lineClamp: lines, overflow: 'hidden' } as const;
}

/** Photo JPEG en URL `data:` : `next/og` n'accepte pas d'octets bruts. */
function _photoSrc(photo: Uint8Array): string {
  const base64 = Buffer.from(photo.buffer, photo.byteOffset, photo.byteLength).toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

/**
 * Affiche carrée 1080 × 1080 pour WhatsApp, rendue par `next/og` (`ImageResponse`) : mêmes faits
 * que l'affiche PDF, en grands caractères lisibles sur un téléphone.
 * WHY: Satori ne connaît que le flexbox et exige `display: flex` sur tout conteneur à plusieurs
 * enfants ; chaque texte est donc une chaîne unique dans son propre bloc, borné en lignes.
 *
 * @example
 * new ImageResponse(<PosterImage data={data} />, { width: 1080, height: 1080, fonts });
 */
export function PosterImage({ data }: PosterImageProps) {
  const theme = DOCUMENT_THEMES[data.style];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        // WHY: sans photo ni phrase, l'affiche reste équilibrée au centre du carré.
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 72,
        backgroundColor: theme.background,
        color: theme.ink,
        fontFamily: FONT_FAMILY,
        fontSize: 28,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {data.photo && (
          // eslint-disable-next-line @next/next/no-img-element -- rendu par Satori, pas par Next
          <img
            src={_photoSrc(data.photo)}
            width={PHOTO.width}
            height={PHOTO.height}
            alt=""
            style={{
              ...PHOTO,
              objectFit: 'cover',
              border: `3px solid ${theme.rule}`,
              padding: 8,
              marginRight: 52,
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ ..._clamp(2), fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
            {data.fullName}
          </div>
          {data.lifeDates && (
            <div style={{ marginTop: 14, fontSize: 30, color: theme.muted }}>{data.lifeDates}</div>
          )}
          {data.cover && (
            <div style={{ ..._clamp(4), marginTop: 24, fontSize: 28, lineHeight: 1.35 }}>
              {data.cover}
            </div>
          )}
        </div>
      </div>
      <div style={{ width: 96, height: 3, backgroundColor: theme.rule, margin: '40px 0 28px' }} />
      <div style={{ fontSize: 38, fontWeight: 700, color: theme.accent }}>
        {data.ceremonyDate ?? data.labels.dateToBeConfirmed}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {data.moments.map((item, index) => (
          <div
            // WHY: deux moments peuvent partager heure et intitulé ; la position les distingue.
            key={`${index}-${item.time}`}
            style={{ display: 'flex', marginTop: 18 }}
          >
            <div style={{ width: 110, fontWeight: 700 }}>{item.time}</div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={_clamp(1)}>{item.moment}</div>
              {item.place && (
                <div style={{ ..._clamp(1), fontSize: 24, color: theme.muted }}>{item.place}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
