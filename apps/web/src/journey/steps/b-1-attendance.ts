import { defineStep, q } from '../define';

/** Étape B.1 : estimer l'affluence, cercle par cercle, et la durée de la veillée. */
export const attendanceStep = defineStep({
  id: 'attendance',
  questions: [
    q.number('attendance.close', { max: 500 }),
    q.number('attendance.extended', { max: 2000 }),
    q.number('attendance.friends', { max: 2000 }),
    q.number('attendance.community', { max: 2000 }),
    q.number('attendance.nights', { max: 7 }),
  ],
  summary: 'budget',
});
