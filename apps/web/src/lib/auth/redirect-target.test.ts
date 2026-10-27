import { describe, expect, it } from 'vitest';
import {
  authCallbackUrl,
  localizedPath,
  loginSuccessTarget,
  safeNextPath,
  withNextParam,
} from './redirect-target';

describe('safeNextPath', () => {
  it('garde un chemin interne', () => {
    expect(safeNextPath('/memorial/jean-ndong')).toBe('/memorial/jean-ndong');
  });

  it('garde un chemin interne avec sa query', () => {
    expect(safeNextPath('/dossier/nouveau?porte=deces')).toBe('/dossier/nouveau?porte=deces');
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['https://evil.com'],
    ['//evil.com'],
    ['/\\evil.com'],
    ['/\t/evil.com'],
    ['/\n/evil.com'],
    ['/\r/evil.com'],
    ['/\u0000/evil.com'],
    ['/\u007f/evil.com'],
    ['@evil.com'],
    ['javascript:alert(1)'],
  ])('rejette la cible %j (redirection ouverte)', (next) => {
    expect(safeNextPath(next)).toBe('/dashboard');
  });

  it('garde les chemins localisés et les query', () => {
    expect(safeNextPath('/en/dossier/nouveau?porte=deces')).toBe('/en/dossier/nouveau?porte=deces');
    expect(safeNextPath('/')).toBe('/');
    expect(safeNextPath('/invitation/abc#x')).toBe('/invitation/abc#x');
  });

  it('utilise le repli fourni', () => {
    expect(safeNextPath('//evil.com', '/')).toBe('/');
  });
});

describe('localizedPath', () => {
  it('laisse la locale par défaut sans préfixe', () => {
    expect(localizedPath('/dashboard', 'fr')).toBe('/dashboard');
  });

  it("préfixe l'anglais", () => {
    expect(localizedPath('/dashboard', 'en')).toBe('/en/dashboard');
  });

  it('ne double pas un préfixe existant', () => {
    expect(localizedPath('/en/dashboard', 'en')).toBe('/en/dashboard');
    expect(localizedPath('/en?x=1', 'en')).toBe('/en?x=1');
  });

  it('ignore une locale inconnue', () => {
    expect(localizedPath('/dashboard', 'de')).toBe('/dashboard');
  });
});

describe('loginSuccessTarget', () => {
  it('ajoute le marqueur de bienvenue', () => {
    expect(loginSuccessTarget({ next: '/dashboard', welcome: '1' }, 'fr')).toBe(
      '/dashboard?welcome=1',
    );
    expect(loginSuccessTarget({ next: '/search?q=jean', welcome: '1' }, 'en')).toBe(
      '/en/search?q=jean&welcome=1',
    );
  });

  it('conserve la query de la cible', () => {
    expect(loginSuccessTarget({ next: '/dossier/nouveau?porte=deces' }, 'fr')).toBe(
      '/dossier/nouveau?porte=deces',
    );
    expect(loginSuccessTarget({ next: '/en/dossier/nouveau?porte=deces' }, 'en')).toBe(
      '/en/dossier/nouveau?porte=deces',
    );
  });

  it('neutralise une cible externe', () => {
    expect(loginSuccessTarget({ next: '//evil.com' }, 'fr')).toBe('/dashboard');
  });
});

describe('withNextParam', () => {
  it('ajoute une cible sûre, encodée', () => {
    expect(withNextParam('/signup', '/dossier/nouveau?porte=deces')).toBe(
      '/signup?next=%2Fdossier%2Fnouveau%3Fporte%3Ddeces',
    );
  });

  it('omet une cible absente ou dangereuse', () => {
    expect(withNextParam('/signup', undefined)).toBe('/signup');
    expect(withNextParam('/login', '//evil.com')).toBe('/login');
    expect(withNextParam('/login', '/\t/evil.com')).toBe('/login');
  });
});

describe('authCallbackUrl', () => {
  const site = 'https://testimona.com';

  it('omits next when absent', () => {
    expect(authCallbackUrl(site, '')).toBe(`${site}/auth/callback`);
    expect(authCallbackUrl(site, null)).toBe(`${site}/auth/callback`);
  });

  it('encodes a safe next path', () => {
    expect(authCallbackUrl(site, '/invitation/abc')).toBe(
      `${site}/auth/callback?next=%2Finvitation%2Fabc`,
    );
  });

  it('drops unsafe targets (no open redirect)', () => {
    expect(authCallbackUrl(site, '//evil.com')).toBe(`${site}/auth/callback`);
    expect(authCallbackUrl(site, 'https://evil.com')).toBe(`${site}/auth/callback`);
    expect(authCallbackUrl(site, '@evil.com')).toBe(`${site}/auth/callback`);
  });
});
