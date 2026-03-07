import { describe, expect, it } from 'vitest';
import { buildToolPagePricingScenarioState } from '@/lib/tool-page/pricing-scenarios';

describe('tool page pricing scenarios', () => {
  it('derives seat-threshold examples when hard limit includes seat cap', () => {
    const result = buildToolPagePricingScenarioState({
      toolName: 'Attio',
      hardLimitText: 'Free plan capped at 3 seats.',
      activeReviewLens: 'startup',
    });

    expect(result.examples[0]).toContain('3 seats or fewer');
    expect(result.examples[1]).toContain('4 seats example');
  });

  it('returns generic examples when no seat cap is detected', () => {
    const result = buildToolPagePricingScenarioState({
      toolName: 'Notion',
      hardLimitText: null,
      activeReviewLens: 'general',
    });

    expect(result.examples[0]).toContain('Small-team example');
    expect(result.examples[1]).toContain('Growth example');
  });

  it('returns enterprise-oriented examples for enterprise lens', () => {
    const result = buildToolPagePricingScenarioState({
      toolName: 'Notion',
      hardLimitText: 'Free plan capped at 3 seats.',
      activeReviewLens: 'enterprise',
    });

    expect(result.examples[0]).toContain('Pilot example');
    expect(result.examples[1]).toContain('contract scope');
  });
});
