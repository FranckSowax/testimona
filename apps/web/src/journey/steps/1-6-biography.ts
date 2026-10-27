import { defineStep, q } from '../define';

/** Étape 1.6 : la biographie, que l'on peut remplir « à sa place ». */
export const biographyStep = defineStep({
  id: 'biography',
  questions: [
    q.place('biography.birthPlace'),
    q.longText('biography.parents'),
    q.longText('biography.career'),
    q.list(
      'biography.traits',
      [
        { name: 'trait', kind: 'shortText', required: true },
        { name: 'anecdote', kind: 'longText' },
      ],
      10,
    ),
    q.longText('biography.passions'),
    q.shortText('biography.motto'),
  ],
});
