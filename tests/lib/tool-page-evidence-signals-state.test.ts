import { describe, expect, it } from 'vitest';
import { buildToolPageConstraintEvidence } from '@/lib/tool-page/constraint-evidence';
import { buildToolPageConstraintEvidenceView } from '@/lib/tool-page/constraint-evidence-view';
import { buildToolPageEvidenceRuntimeInput } from '@/lib/tool-page/evidence-runtime-input';
import { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import {
  buildToolPageEvidenceSignalsState,
  buildToolPageEvidenceSignalsStateFromRoute,
} from '@/lib/tool-page/evidence-signals-state';
import { buildToolPageEvidenceSignalsStateInputFromRouteContext } from '@/lib/tool-page/evidence-signals-route-input';
import { buildToolPageReviewSignalsInput } from '@/lib/tool-page/review-signals-input';
import { deriveToolPageReviewSignals } from '@/lib/tool-page/review-signals';
import { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';

describe('tool page evidence signals state', () => {
  it('matches previous review-signals + evidence-runtime orchestration', () => {
    const input = {
      reviewSignalsInput: {
        firstReview: null,
        toolLastVerifiedAt: '2026-03-04',
        toolPricingVerifiedAt: '2026-03-05',
        extractionDate: '2026-03-03',
      },
      constraintEvidenceInput: {
        constraints: {
          hard_limits: [{ claim: 'No on-prem', source_url: 'https://example.com/docs' }],
          hidden_cost_triggers: [
            { claim: 'Seat minimums', source_url: 'https://example.com/pricing' },
          ],
        },
        isEligibleEvidenceUrl: (url: unknown) =>
          typeof url === 'string' && url.startsWith('https://'),
        isDisallowedConClaim: () => false,
      },
      evidenceRuntimeInput: {
        reviewPros: ['Fast setup'],
        reviewCons: ['No on-prem'],
        globalPros: ['Integrates widely'],
        globalCons: ['No on-prem'],
        toEvidenceBullet: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
        isDisallowedConClaim: () => false,
        decisionSnapshotWatchOuts: ['No on-prem'],
        decisionTradeoffSummaryInitial: 'Great for cloud-first teams',
        officialEvidenceLinks: [
          {
            title: 'Docs',
            url: 'https://example.com/docs',
            domain: 'example.com',
            basis: 'official_docs',
            quality: 'high',
            inclusionReason: 'official',
          },
        ],
        evidenceLinksAll: [
          {
            title: 'Docs',
            url: 'https://example.com/docs',
            domain: 'example.com',
            basis: 'official_docs',
            quality: 'high',
            inclusionReason: 'official',
          },
        ],
        evidenceLinks: [
          {
            title: 'Docs',
            url: 'https://example.com/docs',
            domain: 'example.com',
            basis: 'official_docs',
            quality: 'high',
            inclusionReason: 'official',
          },
        ],
        hasPricing: true,
        knowledgeCard: {
          pricing: { free_tier: true },
          pricing_research: {
            checked_at: '2026-03-05',
            primary_source_url: 'https://example.com/pricing',
          },
        },
        sectionPricingStatus: 'show' as const,
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
        faqItems: [],
        buildEvidenceBulletV2: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
        isEligibleEvidenceUrl: (url: unknown) =>
          typeof url === 'string' && url.startsWith('https://'),
      },
    };

    const state = buildToolPageEvidenceSignalsState(input);

    const reviewSignals = deriveToolPageReviewSignals(
      buildToolPageReviewSignalsInput(input.reviewSignalsInput)
    );
    const reviewSignalsView = buildToolPageReviewSignalsView(reviewSignals);
    const constraintEvidence = buildToolPageConstraintEvidence(input.constraintEvidenceInput);
    const { hiddenCostBullets, hardLimitFromConstraints } =
      buildToolPageConstraintEvidenceView(constraintEvidence);
    const evidenceRuntime = buildToolPageEvidenceRuntime(
      buildToolPageEvidenceRuntimeInput({
        ...input.evidenceRuntimeInput,
        hiddenCostBullets,
        hardLimitFromConstraints,
        pricingVerifiedLabel: reviewSignalsView.pricingVerifiedLabel,
        specsVerifiedLabel: reviewSignalsView.specsVerifiedLabel,
        communityVerifiedLabel: reviewSignalsView.communityVerifiedLabel,
      })
    );

    expect(state.reviewSignalsView).toEqual(reviewSignalsView);
    expect(state.evidenceRuntime.baseEvidenceGrade).toEqual(evidenceRuntime.baseEvidenceGrade);
    expect(state.evidenceRuntime.pricingCheckedLabel).toEqual(evidenceRuntime.pricingCheckedLabel);
    expect(state.evidenceRuntime.collectedSourcesTotal).toEqual(
      evidenceRuntime.collectedSourcesTotal
    );
    expect(state.evidenceRuntime.canonicalHardLimits).toEqual(evidenceRuntime.canonicalHardLimits);
  });

  it('builds evidence signals state from route wrapper input', () => {
    const state = buildToolPageEvidenceSignalsStateFromRoute({
      reviewSignalsInput: {
        firstReview: null,
        toolLastVerifiedAt: '2026-03-04',
        toolPricingVerifiedAt: '2026-03-05',
        extractionDate: '2026-03-03',
      },
      constraintEvidenceInput: {
        constraints: {
          hard_limits: [{ claim: 'No on-prem', source_url: 'https://example.com/docs' }],
          hidden_cost_triggers: [
            { claim: 'Seat minimums', source_url: 'https://example.com/pricing' },
          ],
        },
        isEligibleEvidenceUrl: (url: unknown) =>
          typeof url === 'string' && url.startsWith('https://'),
        isDisallowedConClaim: () => false,
      },
      evidenceRuntimeInput: {
        reviewPros: ['Fast setup'],
        reviewCons: ['No on-prem'],
        globalPros: ['Integrates widely'],
        globalCons: ['No on-prem'],
        toEvidenceBullet: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
        isDisallowedConClaim: () => false,
        decisionSnapshotWatchOuts: ['No on-prem'],
        decisionTradeoffSummaryInitial: 'Great for cloud-first teams',
        officialEvidenceLinks: [],
        evidenceLinksAll: [],
        evidenceLinks: [],
        hasPricing: true,
        knowledgeCard: null,
        sectionPricingStatus: 'show',
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
        faqItems: [],
        buildEvidenceBulletV2: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
        isEligibleEvidenceUrl: (url: unknown) =>
          typeof url === 'string' && url.startsWith('https://'),
      },
    });

    expect(state.reviewSignalsView.pricingVerifiedLabel).toBeTruthy();
    expect(state.evidenceRuntime.baseEvidenceGrade).toBeTruthy();
  });

  it('builds evidence signals wrapper input from flattened route context', () => {
    const state = buildToolPageEvidenceSignalsStateFromRoute(
      buildToolPageEvidenceSignalsStateInputFromRouteContext({
        firstReview: null,
        toolLastVerifiedAt: '2026-03-04',
        toolPricingVerifiedAt: '2026-03-05',
        extractionDate: '2026-03-03',
        constraints: {
          hard_limits: [{ claim: 'No on-prem', source_url: 'https://example.com/docs' }],
          hidden_cost_triggers: [
            { claim: 'Seat minimums', source_url: 'https://example.com/pricing' },
          ],
        },
        isEligibleEvidenceUrl: (url: unknown) =>
          typeof url === 'string' && url.startsWith('https://'),
        isDisallowedConClaim: () => false,
        reviewPros: ['Fast setup'],
        reviewCons: ['No on-prem'],
        globalPros: ['Integrates widely'],
        globalCons: ['No on-prem'],
        toEvidenceBullet: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
        decisionSnapshotWatchOuts: ['No on-prem'],
        decisionTradeoffSummaryInitial: 'Great for cloud-first teams',
        officialEvidenceLinks: [],
        evidenceLinksAll: [],
        evidenceLinks: [],
        hasPricing: true,
        knowledgeCard: null,
        sectionPricingStatus: 'show',
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
        faqItems: [],
        buildEvidenceBulletV2: (value: unknown) =>
          typeof value === 'string' ? { text: value, sourceUrl: null, unverified: false } : null,
      })
    );

    expect(state.reviewSignalsView.pricingVerifiedLabel).toBeTruthy();
    expect(state.evidenceRuntime.baseEvidenceGrade).toBeTruthy();
  });
});
