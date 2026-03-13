import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionSectionStateInputFromRoute } from '@/lib/tool-page/decision-section-route-input';

describe('tool page decision section route input', () => {
  it('returns grouped decision section inputs unchanged', () => {
    const input = buildToolPageDecisionSectionStateInputFromRoute({
      qualityStateInput: {
        tool: { name: 'Acme' },
        firstReview: null,
        reviewSelection: {},
        canonicalFacts: {},
      } as any,
      faqStateInput: { support: { email: true } },
      displaySignalsInput: {
        toolPricingType: 'Freemium',
        reviewSummaryMarkdown: 'Summary',
        toolVerdict: 'Strong shortlist',
        humanVerdict: 'Human verdict',
      },
      decisionRuntimeInput: {
        tool: { name: 'Acme', category: { slug: 'project-management' } },
      } as any,
      sectionRuntimeInput: {
        hasSupportData: true,
      } as any,
      faqSchemaInput: {
        tool: { name: 'Acme' },
      } as any,
    });

    expect(input.displaySignalsInput.humanVerdict).toBe('Human verdict');
    expect(input.decisionRuntimeInput.tool.name).toBe('Acme');
    expect(input.faqSchemaInput.tool.name).toBe('Acme');
  });
});
