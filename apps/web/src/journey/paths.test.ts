import { describe, expect, it } from 'vitest';
import { summaryPath } from './paths';
import type { Step } from './types';

const ID = '11111111-1111-4111-8111-111111111111';
const base: Step = { id: 'demo', questions: [] };

describe('summaryPath', () => {
  it('mène à la page partagée du budget', () => {
    expect(summaryPath(ID, { ...base, summary: 'budget' })).toBe(`/dossier/${ID}/budget`);
  });

  it("mène à la synthèse propre de l'étape", () => {
    expect(summaryPath(ID, { ...base, summary: 'step' })).toBe(
      `/dossier/${ID}/etape/demo/synthese`,
    );
  });

  it('renvoie null sans synthèse', () => {
    expect(summaryPath(ID, base)).toBeNull();
  });
});
