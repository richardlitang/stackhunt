import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionSectionStateInputFromRouteContext } from '@/lib/tool-page/decision-section-route-input';

describe('tool page decision section route input context', () => {
  it('builds decision section input from flattened route context', () => {
    const now = new Date('2026-03-05T12:00:00.000Z');
    const tool = {
      name: 'Acme',
      short_description: 'Short',
      long_description: 'Long',
      pricing_type: 'Freemium',
      verdict: 'Strong shortlist',
      website: 'https://acme.test',
      category: { slug: 'project-management' },
      last_verified_at: '2026-03-01T00:00:00.000Z',
      pricing_verified_at: '2026-03-02T00:00:00.000Z',
      updated_at: '2026-03-03T00:00:00.000Z',
    } as unknown as Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['tool'];
    const firstReview = {
      summary_markdown: 'Summary',
      updated_at: '2026-03-04T00:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
    } as unknown as Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['firstReview'];

    const input = buildToolPageDecisionSectionStateInputFromRouteContext({
      tool,
      firstReview,
      reviewSelection: { firstPublished: null, hasNewerUnpublishedThanPublished: false },
      canonicalFacts: { canonical: { key: 'value' } },
      knowledgeCard: { support: { email: true } },
      setupTracks: [{ label: 'Fast setup' }],
      reviewContentLists: { pros: ['Pro'], cons: ['Con'] },
      audiences: [{ name: 'Startups' }],
      reviewContextSignals: {
        userAdvocate: null,
        budgetAnalyst: null,
        humanVerdict: 'Human verdict',
        decisionSlotsRaw: null,
        decisionIntroRaw: null,
        delighters: ['Delighter'],
        frustrations: ['Frustration'],
        powerTip: 'Power tip',
        vibe: null,
        originStory: null,
        idealFor: ['Startups'],
        avoidIf: ['Enterprises'],
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
      },
      globalCons: ['Global con'],
      hasEligibleNegativeEvidence: true,
      categorySpecificData: { key: 'value' },
      vipSpecifics: { ai: true },
      orderedAlternativesCount: 3,
      eligibleSignalEvidenceCount: 2,
      idealFor: ['Startups'],
      avoidIf: ['Enterprises'],
      delighters: ['Delighter'],
      frustrations: ['Frustration'],
      powerTip: 'Power tip',
      humanVerdict: 'Human verdict',
      hasParentTool: true,
      now,
    });

    expect(input.qualityStateInput.tool.name).toBe('Acme');
    expect(input.displaySignalsInput.humanVerdict).toBe('Human verdict');
    expect(input.decisionRuntimeInput.tool.category.slug).toBe('project-management');
    expect(input.decisionRuntimeInput.knowledgeCard).toEqual({ support: { email: true } });
    expect(input.sectionRuntimeInput.hasSupportData).toBe(true);
    expect(input.sectionRuntimeInput.hasParentTool).toBe(true);
    expect(input.sectionRuntimeInput.now).toEqual(now);
    expect(input.faqSchemaInput.tool.name).toBe('Acme');
  });
});
