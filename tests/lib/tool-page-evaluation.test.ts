import { describe, expect, it } from 'vitest';
import { buildToolPageEvaluationViewModel } from '@/lib/tool-page/evaluation';

describe('tool page evaluation', () => {
  it('returns docs-only defaults without hands-on evidence', () => {
    const result = buildToolPageEvaluationViewModel({
      canonicalFacts: {},
    });

    expect(result.evaluationDepth).toBe('Docs-only');
    expect(result.testedItems).toEqual([
      'Official docs/help pages reviewed',
      'Official pricing pages reviewed',
      'Source dates checked',
    ]);
    expect(result.notTestedItems).toContain('Live product workflow execution');
    expect(result.showWeTestedIt).toBe(false);
  });

  it('returns deep hands-on when three or more checks exist', () => {
    const result = buildToolPageEvaluationViewModel({
      canonicalFacts: {
        hands_on_checks: ['Check one', 'Check two', 'Check three', 'Check four'],
      },
    });

    expect(result.handsOnChecks).toEqual(['Check one', 'Check two', 'Check three', 'Check four']);
    expect(result.evaluationDepth).toBe('Deep hands-on');
    expect(result.testedItems).toEqual(['Check one', 'Check two', 'Check three', 'Check four']);
    expect(result.showWeTestedIt).toBe(true);
  });

  it('hydrates notes and formats tested-at label', () => {
    const result = buildToolPageEvaluationViewModel({
      canonicalFacts: {
        hands_on_test_notes: {
          environment: 'MacBook Pro + test workspace',
          steps: ['Step 1', 'Step 2'],
          findings: ['Finding 1'],
          tested_at: '2026-03-02T10:00:00.000Z',
        },
      },
    });

    expect(result.handsOnTestEnvironment).toBe('MacBook Pro + test workspace');
    expect(result.handsOnTestSteps).toEqual(['Step 1', 'Step 2']);
    expect(result.handsOnTestFindings).toEqual(['Finding 1']);
    expect(result.handsOnTestedAtLabel).toBe('Mar 2, 2026');
    expect(result.showWeTestedIt).toBe(true);
  });
});
