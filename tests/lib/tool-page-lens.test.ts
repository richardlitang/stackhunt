import { describe, expect, it } from 'vitest';
import { buildToolPageLensContent, type BuildToolPageLensContentInput } from '@/lib/tool-page/lens';

const baseInput: BuildToolPageLensContentInput = {
  activeReviewLens: 'general',
  toolName: 'Tool X',
  hasCollectedSources: true,
  hasGettingStarted: false,
  showPricingSection: false,
  hasSecurity: false,
  decisionSnapshotBestWhen: [],
  decisionSnapshotWatchOuts: [],
  decisionSnapshotDifferentiators: [],
  decisionTradeoffSummary: 'Tradeoff not confirmed yet.',
  enterpriseTradeoffOverride: null,
  hardLimitCount: 0,
};

describe('tool page lens content', () => {
  it('builds choose rationale for strong fit when watch-outs are absent', () => {
    const result = buildToolPageLensContent({
      ...baseInput,
      hasCollectedSources: true,
      hardLimitCount: 1,
      decisionSnapshotWatchOuts: [],
    });

    expect(result.verdictLabelRationale).toContain('strong fit');
  });

  it('builds consider rationale when best-fit exists with watch-outs', () => {
    const result = buildToolPageLensContent({
      ...baseInput,
      decisionSnapshotBestWhen: ['Small teams shipping quickly'],
      decisionSnapshotWatchOuts: ['Limited enterprise controls'],
      hardLimitCount: 2,
    });

    expect(result.verdictLabelRationale).toContain('could fit');
  });

  it('builds avoid rationale when no best-fit signal exists', () => {
    const result = buildToolPageLensContent({
      ...baseInput,
      hasCollectedSources: false,
      decisionSnapshotBestWhen: [],
      decisionSnapshotWatchOuts: ['Missing critical compliance controls'],
      hardLimitCount: 3,
    });

    expect(result.verdictLabelRationale).toContain('not a confident recommendation yet');
  });

  it('applies enterprise tradeoff override and produces workflow cards', () => {
    const result = buildToolPageLensContent({
      ...baseInput,
      activeReviewLens: 'enterprise',
      hasSecurity: true,
      showPricingSection: true,
      enterpriseTradeoffOverride: 'Advanced controls require higher plans',
      decisionTradeoffSummary: 'General tradeoff',
      decisionSnapshotBestWhen: ['Governed rollouts'],
      decisionSnapshotDifferentiators: ['Audit trails'],
    });

    expect(result.lensTradeoffLine).toBe('Advanced controls require higher plans');
    expect(result.workflowFitCards).toHaveLength(3);
    expect(result.scoreDrivers).toEqual(['Audit trails', 'Governed rollouts']);
  });

  it('deduplicates workflow highlights case-insensitively', () => {
    const result = buildToolPageLensContent({
      ...baseInput,
      decisionSnapshotBestWhen: ['Fast onboarding', 'fast onboarding'],
      decisionSnapshotDifferentiators: ['Native integrations'],
    });

    expect(result.workflowFitHighlights).toEqual(['Fast onboarding', 'Native integrations']);
  });
});
