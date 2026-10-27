import { defineStep, q } from '../define';
import { LEVELS } from '../options';

/**
 * Étape B.2 : le niveau de cérémonie envisagé par la famille.
 * WHY: c'est une préférence ; le budget retenu sera confirmé par un trésorier (lot 2, PR 2).
 */
export const budgetStep = defineStep({
  id: 'budget',
  questions: [q.choice('budget.level', LEVELS)],
  summary: 'budget',
});
