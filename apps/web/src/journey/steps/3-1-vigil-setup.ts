import { defineStep, q } from '../define';
import { SEATINGS, SHELTERS, VIGIL_PLACE_TYPES, YES_NO } from '../options';

/** Étape 3.1 : installation de la veillée (lieu, abri, sièges, son, lumière). */
export const vigilSetupStep = defineStep({
  id: 'vigil-setup',
  questions: [
    q.place('vigil.place'),
    q.choice('vigil.placeType', VIGIL_PLACE_TYPES),
    q.choice('vigil.shelter', SHELTERS),
    q.choice('vigil.seating', SEATINGS),
    q.choice('vigil.sound', YES_NO),
    q.choice('vigil.lighting', YES_NO),
  ],
  summary: 'step',
  providers: ['tentsChairs', 'sound', 'lighting'],
});
