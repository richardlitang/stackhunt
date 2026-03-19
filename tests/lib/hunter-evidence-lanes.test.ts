import { describe, expect, it } from 'vitest';
import {
  buildHunterLaneOutputs,
  normalizeHunterAnalysisEvidenceLanes,
} from '@/lib/hunter/evidence-lanes';
import type { HunterAnalysis } from '@/lib/hunter/types';

function makeAnalysis(): HunterAnalysis {
  return {
    score: 84,
    pros: [
      {
        text: 'Official docs confirm SSO is available on Business plan.',
        source_url: 'https://acme.com/docs/security',
        source_type: 'official',
        claim_type: 'fact',
        retrieved_at: '2026-03-07T00:00:00.000Z',
      },
      {
        text: 'Users report fast onboarding for small teams.',
        source_url: 'https://reddit.com/r/saas/1',
        source_type: 'community',
        claim_type: 'opinion',
        retrieved_at: '2026-03-07T00:00:00.000Z',
      },
    ],
    cons: [
      {
        text: 'Official pricing page lists seat caps at lower tiers.',
        source_url: 'https://acme.com/pricing',
        source_type: 'official',
        claim_type: 'fact',
        retrieved_at: '2026-03-07T00:00:00.000Z',
      },
    ],
    userReportedPros: [
      {
        text: 'Users report fast onboarding for small teams.',
        source_url: 'https://reddit.com/r/saas/1',
        source_type: 'community',
        claim_type: 'opinion',
        retrieved_at: '2026-03-07T00:00:00.000Z',
      },
    ],
    userReportedCons: [
      {
        text: 'Users report confusing billing when usage spikes.',
        source_url: 'https://news.ycombinator.com/item?id=123',
        source_type: 'community',
        claim_type: 'opinion',
        retrieved_at: '2026-03-07T00:00:00.000Z',
      },
    ],
    summary: 'Acme is a strong fit for teams needing fast rollout and clear governance.',
    sentimentTags: ['practical', 'scalable'],
    pricingType: 'paid',
    graphTags: {
      functions: ['Automation'],
      audiences: ['Startups'],
      platforms: ['Web'],
    },
    reviewContext: {
      humanVerdict: 'Strong shortlist for teams with admin ownership.',
      decisionIntro: {
        best_for: 'Teams scaling automation with clear owner workflows.',
        not_for: 'Teams requiring heavy on-prem customization.',
        main_tradeoff: 'Faster setup, stricter limits at lower tiers.',
        summary: 'Pick Acme when speed matters more than deep custom controls.',
      },
    },
    realityChecks: [
      {
        claim: 'Validate one workflow against starter-plan limits.',
        reality: 'Tier caps can block production rollout.',
        impact: 'Upgrade may be needed earlier than expected.',
        source_url: 'https://acme.com/pricing',
      },
    ],
  };
}

describe('hunter evidence lanes', () => {
  it('builds lane outputs with subject profile and separated evidence sheets', () => {
    const laneOutputs = buildHunterLaneOutputs({
      toolName: 'Acme Copilot',
      toolSlug: 'acme-copilot',
      entityScope: 'copilot',
      analysis: makeAnalysis(),
    });

    expect(laneOutputs.subject_profile.subject_type).toBe('product_surface');
    expect(laneOutputs.subject_profile.entity_scope).toBe('copilot');
    expect(laneOutputs.fact_sheet.official_facts.length).toBeGreaterThan(0);
    expect(laneOutputs.user_signal_sheet.user_signal_pros.length).toBeGreaterThan(0);
    expect(laneOutputs.editorial_decision.best_for).toContain('Teams scaling automation');
    expect(laneOutputs.editorial_decision.main_risk).toBeTruthy();
    expect(laneOutputs.editorial_decision.fit_matrix?.solo.fit).toBe('mixed');
    expect(laneOutputs.editorial_decision.test_before_buy?.length).toBeGreaterThan(0);
  });

  it('categorizes official pricing and limit facts separately', () => {
    const laneOutputs = buildHunterLaneOutputs({
      toolName: 'Acme',
      toolSlug: 'acme',
      entityScope: 'core',
      analysis: makeAnalysis(),
    });

    expect(laneOutputs.fact_sheet.official_pricing_facts.length).toBeGreaterThan(0);
    expect(laneOutputs.fact_sheet.official_limit_facts.length).toBeGreaterThan(0);
    expect(laneOutputs.fact_sheet.pricing_reality?.hidden_cost_triggers.length).toBeGreaterThan(0);
  });

  it('normalizes mixed factual and user-signal claims into the correct lanes', () => {
    const analysis = makeAnalysis();
    analysis.pros.push({
      text: 'Users report support quality varies by timezone.',
      source_url: 'https://reddit.com/r/saas/2',
      source_type: 'community',
      claim_type: 'fact',
      retrieved_at: '2026-03-07T00:00:00.000Z',
    });
    analysis.userReportedCons?.push({
      text: 'Official docs list strict API rate limits on starter plan.',
      source_url: 'https://acme.com/docs/limits',
      source_type: 'official',
      claim_type: 'fact',
      retrieved_at: '2026-03-07T00:00:00.000Z',
    });

    const stats = normalizeHunterAnalysisEvidenceLanes(analysis);

    expect(stats.moved_to_user_signal_pros).toBeGreaterThan(0);
    expect(stats.moved_to_fact_cons).toBeGreaterThan(0);
    expect(stats.claim_type_coerced_to_opinion).toBeGreaterThan(0);
    expect(
      analysis.userReportedPros?.some(
        (claim) =>
          typeof claim !== 'string' &&
          claim.text.includes('support quality varies by timezone') &&
          claim.claim_type === 'opinion'
      )
    ).toBe(true);
    expect(
      analysis.cons.some(
        (claim) =>
          typeof claim !== 'string' &&
          claim.text.includes('Official docs list strict API rate limits')
      )
    ).toBe(true);
  });
});
