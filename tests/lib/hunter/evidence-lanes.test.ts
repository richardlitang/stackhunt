import { describe, expect, it } from 'vitest';
import { buildHunterLaneOutputs } from '@/lib/hunter/evidence-lanes';
import type { HunterAnalysis } from '@/lib/hunter/types';

function analysisWithoutDecisionIntro(): HunterAnalysis {
  return {
    score: 82,
    pros: [
      {
        text: 'Best for product teams that need issue tracking without workflow configuration.',
        source_url: 'https://example.com/features',
        source_type: 'official',
        claim_type: 'fact',
      },
    ],
    cons: [
      {
        text: 'Not for teams that require self-hosting because only cloud deployment is offered.',
        source_url: 'https://example.com/deployment',
        source_type: 'official',
        claim_type: 'fact',
      },
    ],
    summary: 'A focused issue tracker for product teams.',
    sentimentTags: ['focused'],
    pricingType: 'paid',
    graphTags: {
      functions: ['Issue Tracking'],
      audiences: ['Product Teams'],
      platforms: ['Web'],
    },
  };
}

describe('buildHunterLaneOutputs canonical decision snapshot', () => {
  it('fills decision slots from source-backed claims when decisionIntro is absent', () => {
    const outputs = buildHunterLaneOutputs({
      toolName: 'Example',
      toolSlug: 'example',
      analysis: analysisWithoutDecisionIntro(),
    });

    expect(outputs.editorial_decision).toMatchObject({
      best_for: 'Best for product teams that need issue tracking without workflow configuration.',
      not_for: 'Not for teams that require self-hosting because only cloud deployment is offered.',
      main_risk:
        'Not for teams that require self-hosting because only cloud deployment is offered.',
      upgrade_trigger:
        'Not for teams that require self-hosting because only cloud deployment is offered.',
    });
    expect(outputs.editorial_decision.generation_mode).toMatchObject({
      best_for: 'extractive',
      not_for: 'extractive',
      main_tradeoff: 'extractive',
    });
  });
});
