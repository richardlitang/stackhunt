import { describe, expect, it } from 'vitest';
import {
  claimCitationRate,
  reviewText,
  scoreAnalysisAgainstGolden,
  type EvalGolden,
} from '@/lib/hunter/evals/scoring';

describe('claimCitationRate', () => {
  it('counts cited pros and cons across mixed legacy and source-backed claims', () => {
    expect(
      claimCitationRate({
        pros: [{ text: 'Cited pro', source_url: 'https://example.com/pro' }, 'Legacy pro'],
        cons: [{ text: 'Cited con', source_url: 'https://example.com/con' }],
      })
    ).toBeCloseTo(2 / 3, 5);
  });
});

describe('reviewText', () => {
  it('normalizes summary and claim text into one lowercase body', () => {
    expect(
      reviewText({
        summary: 'Strong fit for small teams.',
        pros: [{ text: 'Free tier available' }],
        cons: ['Limited reporting'],
      })
    ).toContain('strong fit for small teams.');
  });
});

describe('scoreAnalysisAgainstGolden', () => {
  it('reports threshold and phrase failures', () => {
    const golden: EvalGolden = {
      toolName: 'Example',
      minClaimCitationRate: 0.8,
      minActionabilityScore: 60,
      minReaderUtilityScore: 65,
      maxCoverageGaps: 1,
      mustMentionAny: [['free tier', 'free plan']],
      mustNotContain: ['guaranteed'],
    };

    const result = scoreAnalysisAgainstGolden({
      analysis: {
        summary: 'Guaranteed to work',
        pros: [{ text: 'Fast setup', source_url: 'https://example.com/pro' }],
        cons: ['Weak free onboarding'],
      },
      golden,
      quality: {
        actionabilityScore: 55,
        readerUtilityScore: 61,
        promptVersions: { synthesis: 'synthesis-v1' },
      },
      coverageGaps: ['pricing_ceilings', 'migration'],
    });

    expect(result.metrics.claimCitationRate).toBeCloseTo(0.5, 5);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        'citation rate 0.50 < 0.8',
        'actionability 55 < 60',
        'reader utility 61 < 65',
        'coverage gaps [pricing_ceilings,migration] > 1',
        'missing all of: free tier | free plan',
        'contains banned phrase: guaranteed',
      ])
    );
  });
});
