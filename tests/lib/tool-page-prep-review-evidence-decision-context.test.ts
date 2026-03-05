import { describe, expect, it } from 'vitest';
import { buildToolPagePrepDecisionStateFromDecisionContext } from '@/lib/tool-page/prep-decision-decision-context';
import { buildToolPagePrepReviewEvidenceStateFromDecisionContext } from '@/lib/tool-page/prep-review-evidence-decision-context';
import { buildToolPageReviewEvidenceStateFromDecisionContext } from '@/lib/tool-page/review-evidence-decision-context';

describe('tool page prep/review-evidence decision context', () => {
  it('matches explicit prep-decision then review-evidence wiring', () => {
    const prepDecision = {
      prep: {
        reviewSources: [{ source_url: 'https://docs.example.com' }],
        isEligibleEvidenceUrl: (value: string) => value.startsWith('https://'),
        tool: { slug: 'acme', name: 'Acme' },
        orderedAlternatives: [{ slug: 'alt-1', name: 'Alt 1' }],
      },
      decision: {
        tool: { slug: 'acme', name: 'Acme' },
        firstReview: null,
        reviewSelection: {
          firstPublished: null,
          selected: null,
          hasNewerUnpublishedThanPublished: false,
        },
        canonicalFacts: [],
        knowledgeCard: null,
        setupTracks: [{ title: 'Setup', bullets: ['Invite your team'] }],
        reviewContentLists: { pros: [], cons: [], sources: [] },
        audiences: [],
        reviewContextSignals: {
          idealFor: ['small teams'],
          avoidIf: ['regulated workloads'],
          delighters: ['fast onboarding'],
          frustrations: ['limited exports'],
          powerTip: 'start with templates',
          humanVerdict: 'Strong choice for small teams.',
        },
        globalCons: [],
        categorySpecificData: null,
        vipSpecifics: null,
        hasParentTool: false,
        now: new Date('2026-03-05T00:00:00.000Z'),
        orderedAlternativesCount: 1,
      },
    } as never;
    const reviewEvidence = {
      reviewArtifacts: {
        canonicalFacts: [],
        reviewSources: [],
        tool: { slug: 'acme', name: 'Acme' },
      },
      evidenceContext: {
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
        knowledgeCard: null,
      },
      reviewContextSignals: {
        budgetCostDrivers: ['per-seat pricing'],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: ['annual discount'],
        budgetRoiThreshold: '5 seats',
      },
    } as never;

    const result = buildToolPagePrepReviewEvidenceStateFromDecisionContext({
      prepDecision,
      reviewEvidence,
    });

    const prepDecisionResult = buildToolPagePrepDecisionStateFromDecisionContext(prepDecision);
    const reviewEvidenceResult = buildToolPageReviewEvidenceStateFromDecisionContext({
      ...reviewEvidence,
      evidenceContext: {
        ...reviewEvidence.evidenceContext,
        isDisallowedConClaim:
          prepDecisionResult.decisionSectionState.decisionRuntime.isDisallowedConClaim,
        toEvidenceBullet: prepDecisionResult.prepState.toEvidenceBullet,
        hasPricing: prepDecisionResult.decisionSectionState.decisionRuntime.hasPricing,
        faqItems: prepDecisionResult.decisionSectionState.faqState.faqItems,
      },
      prepState: prepDecisionResult.prepState,
      decisionRuntime: prepDecisionResult.decisionSectionState.decisionRuntime,
      qualityState: prepDecisionResult.decisionSectionState.qualityState,
    });

    expect(result.prepState.hasComparableAlternatives).toBe(
      prepDecisionResult.prepState.hasComparableAlternatives
    );
    expect(result.prepState.hasEligibleNegativeEvidence).toBe(
      prepDecisionResult.prepState.hasEligibleNegativeEvidence
    );
    expect(result.prepState.eligibleSignalEvidenceCount).toBe(
      prepDecisionResult.prepState.eligibleSignalEvidenceCount
    );
    expect(JSON.parse(JSON.stringify(result.decisionSectionState))).toEqual(
      JSON.parse(JSON.stringify(prepDecisionResult.decisionSectionState))
    );
    expect(result.reviewArtifactsState).toEqual(reviewEvidenceResult.reviewArtifactsState);
    expect(result.evidenceSignalsState).toEqual(reviewEvidenceResult.evidenceSignalsState);
  });
});
