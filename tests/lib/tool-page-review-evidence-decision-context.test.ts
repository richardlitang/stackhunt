import { describe, expect, it } from 'vitest';
import { buildToolPageReviewEvidenceStateFromDecisionContext } from '@/lib/tool-page/review-evidence-decision-context';
import { buildToolPageReviewEvidenceStateFromRouteContext } from '@/lib/tool-page/review-evidence-state';

describe('tool page review/evidence decision context', () => {
  it('matches explicit route-context wiring', () => {
    const reviewArtifacts = {
      canonicalFacts: [],
      reviewSources: [],
      tool: { slug: 'acme', name: 'Acme' },
    };
    const evidenceContext = {
      firstReview: null,
      toolLastVerifiedAt: null,
      toolPricingVerifiedAt: null,
      extractionDate: null,
      constraints: [],
      isEligibleEvidenceUrl: (value: string) => value.startsWith('https://'),
      reviewPros: [],
      reviewCons: [],
      globalPros: [],
      globalCons: [],
      toEvidenceBullet: (text: string) => ({ text, sourceUrl: null }),
      buildEvidenceBulletV2: (text: string) => ({
        text,
        sourceUrl: null,
        basis: 'Official docs/help center',
      }),
      hasPricing: true,
      knowledgeCard: null,
      faqItems: [],
    };
    const decisionRuntime = {
      isDisallowedConClaim: () => false,
      decisionSnapshotWatchOuts: [],
      decisionTradeoffSummaryInitial: null,
    };
    const prepState = {
      buildEvidenceBulletV2: (text: string) => ({
        text,
        sourceUrl: null,
        basis: 'Official docs/help center',
      }),
    };
    const qualityState = { sectionStatus: { pricing: 'confirmed' } };
    const reviewContextSignals = {
      budgetCostDrivers: ['per-seat pricing'],
      budgetOneTimeFees: [],
      budgetCommitmentTerms: ['annual discount'],
      budgetRoiThreshold: '5 seats',
    };

    const result = buildToolPageReviewEvidenceStateFromDecisionContext({
      reviewArtifacts: reviewArtifacts as never,
      evidenceContext: evidenceContext as never,
      decisionRuntime: decisionRuntime as never,
      prepState: prepState as never,
      qualityState: qualityState as never,
      reviewContextSignals,
    });

    const expected = buildToolPageReviewEvidenceStateFromRouteContext({
      reviewArtifacts: reviewArtifacts as never,
      evidenceSignals: {
        firstReview: null,
        toolLastVerifiedAt: null,
        toolPricingVerifiedAt: null,
        extractionDate: null,
        constraints: [],
        isEligibleEvidenceUrl: evidenceContext.isEligibleEvidenceUrl,
        isDisallowedConClaim: decisionRuntime.isDisallowedConClaim,
        reviewPros: [],
        reviewCons: [],
        globalPros: [],
        globalCons: [],
        toEvidenceBullet: evidenceContext.toEvidenceBullet,
        decisionSnapshotWatchOuts: [],
        decisionTradeoffSummaryInitial: null,
        hasPricing: true,
        knowledgeCard: null,
        sectionPricingStatus: 'confirmed',
        budgetCostDrivers: reviewContextSignals.budgetCostDrivers,
        budgetOneTimeFees: reviewContextSignals.budgetOneTimeFees,
        budgetCommitmentTerms: reviewContextSignals.budgetCommitmentTerms,
        budgetRoiThreshold: reviewContextSignals.budgetRoiThreshold,
        faqItems: [],
        buildEvidenceBulletV2: prepState.buildEvidenceBulletV2,
      },
    });

    expect(result.reviewArtifactsState).toEqual(expected.reviewArtifactsState);
    expect(result.evidenceSignalsState).toEqual(expected.evidenceSignalsState);
  });
});
