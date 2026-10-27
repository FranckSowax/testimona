import { defineStep, q } from '../define';
import { FLOWERS } from '../options';

/** Étape 2.3 : l'annonce par e-mail, copiée dans la messagerie de la famille. */
export const emailAnnouncementStep = defineStep({
  id: 'email-announcement',
  questions: [
    q.longText('announce.aboutPerson'),
    q.longText('announce.practicalInfo'),
    q.choice('announce.flowersOrDonations', FLOWERS),
  ],
  draft: { key: 'announce.email.text', kind: 'email' },
});
