import { describe, expect, it } from 'vitest';
import {
  shouldEscalateSynthesis,
  synthesisQualityScore,
  ESCALATION_TRIGGERS,
} from '@/lib/hunter/escalation';
import type { SynthesisGenerationQuality } from '@/lib/hunter/services/gemini';

function quality(overrides: Partial<SynthesisGenerationQuality> = {}): SynthesisGenerationQuality {
  return {
    stage1Enabled: true,
    meanConfidence: 0.9,
    lowConfidenceRatio: 0.1,
    actionabilityScore: 70,
    readerUtilityScore: 70,
    abstainedFields: [],
    ...overrides,
  };
}

describe('shouldEscalateSynthesis', () => {
  it('does not escalate a strong result', () => {
    expect(shouldEscalateSynthesis(quality()).escalate).toBe(false);
  });

  it('never escalates when stage-1 signals are unavailable', () => {
    const weak = quality({ stage1Enabled: false, meanConfidence: 0.1, lowConfidenceRatio: 0.9 });
    expect(shouldEscalateSynthesis(weak)).toEqual({ escalate: false, reasons: [] });
  });

  it('escalates on low mean confidence', () => {
    const decision = shouldEscalateSynthesis(quality({ meanConfidence: 0.4 }));
    expect(decision.escalate).toBe(true);
    expect(decision.reasons[0]).toContain('mean_confidence');
  });

  it('escalates on high low-confidence ratio', () => {
    const decision = shouldEscalateSynthesis(quality({ lowConfidenceRatio: 0.6 }));
    expect(decision.escalate).toBe(true);
    expect(decision.reasons[0]).toContain('low_conf_ratio');
  });

  it('escalates when too many fields are abstained', () => {
    const decision = shouldEscalateSynthesis(
      quality({ abstainedFields: ['verdict', 'faqs', 'reviewContext'] })
    );
    expect(decision.escalate).toBe(true);
    expect(decision.reasons[0]).toContain('abstained_fields');
  });

  it('escalates when actionability is below the draft-forcing floor', () => {
    const decision = shouldEscalateSynthesis(quality({ actionabilityScore: 45 }));
    expect(decision.escalate).toBe(true);
    expect(decision.reasons.some((r) => r.includes('actionability'))).toBe(true);
  });

  it('escalates when reader utility is below the draft-forcing floor', () => {
    const decision = shouldEscalateSynthesis(quality({ readerUtilityScore: 38 }));
    expect(decision.escalate).toBe(true);
    expect(decision.reasons.some((r) => r.includes('reader_utility'))).toBe(true);
  });

  it('respects an injected config', () => {
    const decision = shouldEscalateSynthesis(quality({ meanConfidence: 0.7 }), {
      ...ESCALATION_TRIGGERS,
      minMeanConfidence: 0.8,
    });
    expect(decision.escalate).toBe(true);
  });
});

describe('synthesisQualityScore', () => {
  it('ranks a confident, well-sourced result above a weak one', () => {
    const strong = synthesisQualityScore(quality());
    const weak = synthesisQualityScore(
      quality({
        meanConfidence: 0.3,
        lowConfidenceRatio: 0.7,
        actionabilityScore: 20,
        readerUtilityScore: 20,
        abstainedFields: ['verdict', 'faqs'],
      })
    );
    expect(strong).toBeGreaterThan(weak);
  });
});
