import { defineStep, q } from '../define';
import { TONES } from '../options';

/** Nombre maximal de moments du programme. */
export const PROGRAM_MAX_ITEMS = 40;
export const CEREMONY_STEP_ID = 'ceremony-program';

/** Étape 3.4 : déroulé de la cérémonie (date, lieux, registre, programme). */
export const ceremonyProgramStep = defineStep({
  id: CEREMONY_STEP_ID,
  questions: [
    q.date('ceremony.date'),
    // WHY: une adresse ou un lien Google Maps collé, pas un `place` (ville + pays) : un lien
    // Maps vers une ville seule ne guide personne jusqu'au lieu.
    q.shortText('ceremony.liftPlace'),
    q.shortText('ceremony.servicePlace'),
    q.shortText('ceremony.burialPlace'),
    // WHY: une clé ne peut appartenir qu'à une étape (`assertUniqueSteps`) ; le registre de la
    // cérémonie a donc sa propre clé, préremplie depuis celui des annonces.
    q.choice('ceremony.tone', TONES, { prefillFrom: 'announce.tone' }),
    q.list(
      'ceremony.program',
      [
        { name: 'time', kind: 'time', required: true },
        { name: 'moment', kind: 'shortText', required: true },
        { name: 'place', kind: 'shortText' },
        { name: 'lead', kind: 'shortText' },
      ],
      PROGRAM_MAX_ITEMS,
      { starter: 'ceremonyProgram' },
    ),
  ],
  summary: 'step',
  providers: ['funeralHome'],
});
