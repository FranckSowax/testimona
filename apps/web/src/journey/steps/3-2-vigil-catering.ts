import { defineStep, q } from '../define';
import { COOKS, DRINKS, SERVINGS, YES_NO } from '../options';

/** Étape 3.2 : restauration de la veillée et du jour des obsèques. */
export const vigilCateringStep = defineStep({
  id: 'vigil-catering',
  questions: [
    q.choice('catering.served', SERVINGS),
    q.choice('catering.cook', COOKS),
    q.choice('catering.drinks', DRINKS),
    q.choice('catering.funeralMeal', YES_NO),
  ],
  summary: 'step',
  providers: ['catering', 'drinks'],
});
