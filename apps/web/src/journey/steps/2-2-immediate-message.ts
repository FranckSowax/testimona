import { defineStep, q } from '../define';
import { CAUSES, TONES } from '../options';

/** Étape 2.2 : le message immédiat, partagé par WhatsApp ou SMS. */
export const immediateMessageStep = defineStep({
  id: 'immediate-message',
  questions: [
    q.date('death.date'),
    q.choice('death.mentionCause', CAUSES),
    q.choice('announce.tone', TONES),
  ],
  draft: { key: 'announce.whatsapp.text', kind: 'whatsapp' },
});
