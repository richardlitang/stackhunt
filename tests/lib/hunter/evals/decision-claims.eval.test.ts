import { describe, expect, it } from 'vitest';
import { scoreAnalysisAgainstGolden, type EvalGolden } from '@/lib/hunter/evals/scoring';
import { SYNTHESIS_PROMPT } from '@/lib/hunter/services/prompts';

const golden: EvalGolden = {
  toolName: 'Example',
  minClaimCitationRate: 1,
  minActionabilityScore: 80,
  minReaderUtilityScore: 80,
  maxCoverageGaps: 0,
  mustMentionAny: [],
  mustNotContain: ['validated against source documentation'],
  requireDecisionShapedClaims: true,
  maxVerdictCharacters: 140,
};

const quality = {
  actionabilityScore: 90,
  readerUtilityScore: 90,
  promptVersions: { synthesis: 'synthesis-v2' },
};

describe('decision-shaped claim eval', () => {
  it('instructs synthesis to emit decision-shaped claims at the source', () => {
    expect(SYNTHESIS_PROMPT).toContain(
      'Every pro and con must be one sentence that names a buyer scenario and its consequence.'
    );
    expect(SYNTHESIS_PROMPT).toContain(
      'The verdict must be one sentence and at most 140 characters.'
    );
    expect(SYNTHESIS_PROMPT).toContain('validated against source documentation');
  });

  it('accepts single-sentence claims that name a scenario and consequence', () => {
    const result = scoreAnalysisAgainstGolden({
      analysis: {
        pros: [
          {
            text: 'Best for product teams that need issue tracking without workflow configuration.',
            source_url: 'https://example.com/features',
          },
        ],
        cons: [
          {
            text: 'Not for teams that require self-hosting because only cloud deployment is offered.',
            source_url: 'https://example.com/deployment',
          },
        ],
        verdict: 'Choose for fast issue tracking; avoid when self-hosting is mandatory.',
      },
      golden,
      quality,
      coverageGaps: [],
    });

    expect(result.failures).toEqual([]);
  });

  it('rejects generic, multi-sentence, hedged, and overlong decision copy', () => {
    const result = scoreAnalysisAgainstGolden({
      analysis: {
        pros: [
          {
            text: 'Powerful features. Easy to use.',
            source_url: 'https://example.com/features',
          },
        ],
        cons: [
          {
            text: 'Validated against source documentation.',
            source_url: 'https://example.com/deployment',
          },
        ],
        verdict: `Best for teams ${'with complex requirements '.repeat(8)}.`,
      },
      golden,
      quality,
      coverageGaps: [],
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        'pros[0] must be one sentence',
        'pros[0] must name a buyer scenario and consequence',
        'cons[0] must name a buyer scenario and consequence',
        'contains banned phrase: validated against source documentation',
        'verdict exceeds 140 characters',
      ])
    );
  });
});
