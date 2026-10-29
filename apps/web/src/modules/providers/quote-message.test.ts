import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { QUOTE_MESSAGE_MAX, quantitiesFor, quoteHref, quoteMessage } from './quote-message';

const tFr = createTranslator({ locale: 'fr', messages: fr });
const tEn = createTranslator({ locale: 'en', messages: en });
const t = (key: string, values?: Record<string, string | number>) =>
  tFr(key as never, values as never);

const quantities = [
  { key: 'tents', count: 2 },
  { key: 'chairs', count: 100 },
  { key: 'soundSystems', count: 1 },
] as const;

describe('quantitiesFor', () => {
  it('ne garde que les quantités de la catégorie', () => {
    expect(quantitiesFor('tentsChairs', quantities)).toEqual([
      { key: 'tents', count: 2 },
      { key: 'chairs', count: 100 },
    ]);
    expect(quantitiesFor('sound', quantities)).toEqual([{ key: 'soundSystems', count: 1 }]);
    expect(quantitiesFor('printing', quantities)).toEqual([]);
  });
});

describe('quoteMessage', () => {
  const base = {
    providerName: 'Tentes Owendo',
    category: 'tentsChairs' as const,
    place: 'Libreville',
    date: null,
    quantities,
  };

  it('compose le message en français, date à préciser', () => {
    expect(quoteMessage(base, t)).toBe(
      [
        'Bonjour Tentes Owendo,',
        'Nous organisons des funérailles et souhaitons un devis pour : Tentes et chaises.',
        'Date : à préciser',
        'Lieu : Libreville',
        'Besoins estimés :',
        `- ${t('journey.synthesis.quantity.tents', { count: 2 })}`,
        `- ${t('journey.synthesis.quantity.chairs', { count: 100 })}`,
        'Pouvez-vous nous envoyer un devis ? Merci.',
      ].join('\n'),
    );
  });

  it('omet les besoins sans quantité de la catégorie', () => {
    const message = quoteMessage({ ...base, category: 'drinks' }, t);
    expect(message).not.toContain('Besoins estimés');
  });

  it('donne la date quand elle est connue', () => {
    expect(quoteMessage({ ...base, date: '14 novembre 2026' }, t)).toContain(
      'Date : 14 novembre 2026',
    );
  });

  it('se traduit en anglais', () => {
    const message = quoteMessage(base, (key, values) => tEn(key as never, values as never));
    expect(message.startsWith('Hello Tentes Owendo,')).toBe(true);
  });

  it('reste sous la limite de la base', () => {
    expect(quoteMessage(base, t).length).toBeLessThanOrEqual(QUOTE_MESSAGE_MAX);
  });
});

describe('quoteHref', () => {
  it('retire le + et encode le message', () => {
    expect(quoteHref('+24177123456', 'Bonjour & merci')).toBe(
      'https://wa.me/24177123456?text=Bonjour%20%26%20merci',
    );
  });
});
