import { describe, expect, it } from 'vitest';
import { draftFor } from './index';
import { emailAnnouncement } from './email-announcement';
import { immediateMessage } from './immediate-message';

const ctx = {
  locale: 'fr' as const,
  person: { firstName: 'Jean', lastName: 'Ndong', nickname: null },
  answers: { 'death.date': '2026-03-03' },
};

describe('draftFor', () => {
  it('choisit le modèle selon le type de brouillon', () => {
    expect(draftFor('whatsapp', ctx)).toBe(immediateMessage(ctx));
    expect(draftFor('email', ctx)).toBe(emailAnnouncement(ctx));
  });
});
