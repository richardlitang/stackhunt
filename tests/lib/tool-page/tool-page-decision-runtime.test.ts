import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision/decision-runtime';

describe('tool page decision runtime', () => {
  it('derives setup, pricing, and snapshot fields from normalized inputs', () => {
    const result = buildToolPageDecisionRuntime({
      tool: {
        name: 'Acme',
        short_description: 'Short summary',
        long_description: 'Long summary with distinct detail',
        pricing_type: 'paid',
        verdict: null,
        website: 'https://acme.test',
        category: { slug: 'marketing' },
      },
      knowledgeCard: {
        meta: { comparative_feature_peer_count: 4 },
        pricing: { starting_price: '$20' },
        smp_pricing: { plans: [{ name: 'Starter', price_monthly: 20 }] },
        features: { unique: ['Fast setup'], core: ['Fast setup', 'Audit logs'] },
      },
      setupTracks: null,
      review: {
        summary_markdown: null,
        pros: ['Great for startups'],
        cons: ['Needs setup time'],
      },
      tags: {
        audiences: [{ name: 'Startup teams' }],
      },
      reviewContextSignals: {
        humanVerdict: null,
        decisionSlotsRaw: {
          what_it_is: 'Strong for startup teams',
          best_fit: 'Startup teams',
          weak_fit: 'Large enterprises',
          tradeoff: 'Needs setup time',
        },
        decisionIntroRaw: null,
        idealFor: ['Startup teams'],
        avoidIf: ['Large enterprises'],
      },
      sectionStatus: {
        pricing: 'show',
        verdict: 'show',
      },
      globalCons: ['Needs setup time'],
      hasEligibleNegativeEvidence: true,
      renderVerdict: 'Balanced fit for smaller teams.',
    });

    expect(result.hasAbout).toBe(true);
    expect(result.comparativeFeaturePeerCount).toBe(4);
    expect(result.hasPricing).toBe(true);
    expect(result.hasVerdict).toBe(true);
    expect(result.decisionSnapshotSummary).toContain('Strong for startup teams');
    expect(result.decisionSnapshotBestWhen).toContain('Startup teams');
    expect(result.decisionSnapshotWatchOuts).toContain('Large enterprises');
    expect(result.decisionSnapshotDifferentiators).toEqual(['Fast setup', 'Audit logs']);
  });

  it('guards negative verdict claims when evidence is below threshold', () => {
    const result = buildToolPageDecisionRuntime({
      tool: {
        name: 'Acme',
        short_description: 'Short summary',
        long_description: null,
        pricing_type: 'paid',
        verdict: null,
        website: null,
        category: { slug: 'operations' },
      },
      knowledgeCard: {
        pricing: { starting_price: null },
      },
      setupTracks: null,
      review: {
        summary_markdown: 'This tool is expensive and unreliable.',
        pros: [],
        cons: ['High cost'],
      },
      tags: {
        audiences: [],
      },
      reviewContextSignals: {
        humanVerdict: 'Avoid if you need reliability.',
        decisionSlotsRaw: null,
        decisionIntroRaw: null,
        idealFor: [],
        avoidIf: ['You need reliability'],
      },
      sectionStatus: {
        pricing: 'show',
        verdict: 'show',
      },
      globalCons: ['High cost'],
      hasEligibleNegativeEvidence: false,
      renderVerdict: 'Fallback verdict for limited evidence.',
    });

    expect(result.guardedHumanVerdict).toBeNull();
    expect(result.guardedAvoidIf).toEqual([]);
    expect(result.renderVerdictSafe).toBe('Fallback verdict for limited evidence.');
    expect(result.hasVerdict).toBe(true);
  });
});
