// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { ShareSummary } from './ShareSummary';

const t = messages.closing.share;
const TEXT = 'Cotisations pour Jean Ndong\n\nReçu : 250 000 FCFA';

function setNavigator(name: 'clipboard' | 'share', value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
}

function renderShare() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ShareSummary text={TEXT} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  setNavigator('clipboard', undefined);
  setNavigator('share', undefined);
});

describe('ShareSummary', () => {
  it('montre le texte dans un champ en lecture seule', () => {
    renderShare();
    const field = screen.getByLabelText(t.label) as HTMLTextAreaElement;
    expect(field.value).toBe(TEXT);
    expect(field.readOnly).toBe(true);
  });

  it('copie le texte et l’annonce', async () => {
    const writeText = vi.fn(async () => {});
    setNavigator('clipboard', { writeText });
    renderShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.copy }));
    });
    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(screen.getByRole('status').textContent).toBe(t.copied);
  });

  it('sélectionne le texte sans presse-papiers', async () => {
    renderShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.copy }));
    });
    expect(screen.getByRole('status').textContent).toBe(t.copyManual);
    expect(document.activeElement).toBe(screen.getByLabelText(t.label));
  });

  it('ne propose le partage du téléphone que s’il existe', async () => {
    renderShare();
    expect(screen.queryByRole('button', { name: t.share })).toBeNull();
    cleanup();
    const share = vi.fn(async () => {});
    setNavigator('share', share);
    renderShare();
    const button = await screen.findByRole('button', { name: t.share });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(share).toHaveBeenCalledWith({ text: TEXT });
  });

  it('ouvre WhatsApp avec le texte, dans un nouvel onglet annoncé', () => {
    renderShare();
    const link = screen.getByRole('link', { name: t.whatsappLabel });
    expect(link.getAttribute('href')).toBe(`https://wa.me/?text=${encodeURIComponent(TEXT)}`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('se replie sur la sélection quand l’écriture dans le presse-papiers échoue', async () => {
    setNavigator('clipboard', {
      writeText: vi.fn(async () => Promise.reject(new Error('denied'))),
    });
    renderShare();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: t.copy }));
    });
    expect(screen.getByRole('status').textContent).toBe(t.copyManual);
    expect(document.activeElement).toBe(screen.getByLabelText(t.label));
  });

  it('ne dit rien quand la personne ferme la feuille de partage', async () => {
    const writeText = vi.fn(async () => {});
    setNavigator('clipboard', { writeText });
    setNavigator(
      'share',
      vi.fn(async () => Promise.reject(new DOMException('x', 'AbortError'))),
    );
    renderShare();
    const button = await screen.findByRole('button', { name: t.share });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('copie le texte quand le partage échoue pour une autre raison', async () => {
    const writeText = vi.fn(async () => {});
    setNavigator('clipboard', { writeText });
    setNavigator(
      'share',
      vi.fn(async () => Promise.reject(new DOMException('x', 'NotAllowedError'))),
    );
    renderShare();
    const button = await screen.findByRole('button', { name: t.share });
    await act(async () => {
      fireEvent.click(button);
    });
    expect(writeText).toHaveBeenCalledWith(TEXT);
    expect(screen.getByRole('status').textContent).toBe(t.copied);
  });

  it('réannonce une deuxième copie', async () => {
    setNavigator('clipboard', { writeText: vi.fn(async () => {}) });
    renderShare();
    const button = screen.getByRole('button', { name: t.copy });
    await act(async () => {
      fireEvent.click(button);
    });
    const seen: string[] = [];
    const observer = new MutationObserver(() =>
      seen.push(screen.getByRole('status').textContent ?? ''),
    );
    observer.observe(screen.getByRole('status'), {
      childList: true,
      characterData: true,
      subtree: true,
    });
    await act(async () => {
      fireEvent.click(button);
    });
    await act(async () => {});
    observer.disconnect();
    expect(seen).toEqual(['', t.copied]);
  });
});
