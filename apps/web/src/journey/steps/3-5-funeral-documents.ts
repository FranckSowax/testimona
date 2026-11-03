import { defineStep, q } from '../define';
import { DOCUMENT_STYLES } from '../options';

/** Identifiant de l'étape 3.5 (segment d'URL). */
export const DOCUMENTS_STEP_ID = 'funeral-documents';

/** Étape 3.5 : livret et affiche (variante ; photo et textes sur la synthèse). */
export const funeralDocumentsStep = defineStep({
  id: DOCUMENTS_STEP_ID,
  questions: [q.choice('documents.style', DOCUMENT_STYLES)],
  summary: 'step',
});
