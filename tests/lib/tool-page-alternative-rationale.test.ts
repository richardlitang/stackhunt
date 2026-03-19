import { describe, expect, it } from 'vitest';

import {
  buildAlternativeComparisonAxisLabel,
  buildAlternativeChooseLine,
  buildAlternativeRationaleSourceLabel,
} from '@/lib/tool-page/alternative-rationale';

describe('buildAlternativeChooseLine', () => {
  it('uses curated verdict when available', () => {
    const result = buildAlternativeChooseLine({
      altName: 'Salesforce',
      mainName: 'Attio',
      curatedVerdict: 'you need enterprise governance controls',
      computedDiff: { priceDiff: 'Higher seat cost' },
    });

    expect(result).toBe('Choose Salesforce instead if: you need enterprise governance controls');
  });

  it('includes concrete computed pricing signal when curated verdict is absent', () => {
    const result = buildAlternativeChooseLine({
      altName: 'Pipedrive',
      mainName: 'Attio',
      computedDiff: { priceDiff: 'Free vs $29/user.' },
    });

    expect(result).toContain('Free vs $29/user');
  });

  it('falls back to a decision-oriented choose line when no evidence exists', () => {
    const result = buildAlternativeChooseLine({
      altName: 'HubSpot',
      mainName: 'Attio',
      computedDiff: null,
    });

    expect(result).toContain('pricing model, rollout speed, or capability mix');
  });
});

describe('buildAlternativeRationaleSourceLabel', () => {
  it('returns comparison brief when curated verdict exists', () => {
    expect(buildAlternativeRationaleSourceLabel('Enterprise fit')).toBe('Comparison brief');
  });

  it('returns pending verification without curated verdict', () => {
    expect(buildAlternativeRationaleSourceLabel(null)).toBe('Pending verification');
  });
});

describe('buildAlternativeComparisonAxisLabel', () => {
  it('returns comparison brief when curated verdict exists', () => {
    expect(
      buildAlternativeComparisonAxisLabel({
        curatedVerdict: 'Enterprise controls are stronger',
        computedDiff: { priceDiff: 'Higher seat cost' },
      })
    ).toBe('Comparison brief');
  });

  it('returns pricing model when pricing diff drives recommendation', () => {
    expect(
      buildAlternativeComparisonAxisLabel({
        computedDiff: { priceDiff: 'Free vs $29/user' },
      })
    ).toBe('Pricing model');
  });

  it('returns workflow fit fallback when no explicit diff exists', () => {
    expect(
      buildAlternativeComparisonAxisLabel({
        computedDiff: null,
      })
    ).toBe('Workflow fit');
  });
});
