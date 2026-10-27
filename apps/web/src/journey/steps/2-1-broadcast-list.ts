import { defineStep, q } from '../define';
import { CIRCLES } from '../options';

/** Étape 2.1 : qui prévenir, et quel membre de la famille s'en charge. */
export const broadcastListStep = defineStep({
  id: 'broadcast-list',
  questions: [
    q.list(
      'broadcast.contacts',
      [
        { name: 'name', kind: 'shortText', required: true },
        { name: 'phone', kind: 'shortText' },
        { name: 'circle', kind: 'choice', options: CIRCLES },
        { name: 'caller', kind: 'shortText' },
        { name: 'priority', kind: 'boolean' },
      ],
      // WHY: 80 contacts complets restent sous la borne de 60 000 octets d'une réponse.
      80,
    ),
  ],
});
