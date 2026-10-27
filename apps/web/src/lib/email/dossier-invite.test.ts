import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('resend', () => ({ Resend: class {} }));

const { dossierInviteEmail } = await import('./resend');

describe('dossierInviteEmail', () => {
  it('construit un e-mail en français avec le lien', () => {
    const mail = dossierInviteEmail({
      to: 'marie@test.local',
      inviterName: 'Paul',
      personName: 'Jean Ndong',
      url: 'https://exemple.test/invitation/abc',
      locale: 'fr',
    });
    expect(mail.to).toBe('marie@test.local');
    expect(mail.subject).toContain('Jean Ndong');
    expect(mail.html).toContain('https://exemple.test/invitation/abc');
  });

  it('échappe le HTML des noms', () => {
    const mail = dossierInviteEmail({
      to: 'marie@test.local',
      inviterName: '<script>x</script>',
      personName: 'Jean',
      url: 'https://exemple.test/invitation/abc',
      locale: 'en',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
