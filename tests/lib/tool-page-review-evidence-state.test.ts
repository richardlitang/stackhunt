import { describe, expect, it } from 'vitest';
import { buildToolPageEvidenceSignalsStateInputFromRouteContext } from '@/lib/tool-page/evidence-signals-route-input';
import { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence-signals-state';
import { buildToolPageReviewArtifactsStateFromRouteContext } from '@/lib/tool-page/review-artifacts-state';
import { buildToolPageReviewEvidenceStateFromRouteContext } from '@/lib/tool-page/review-evidence-state';

describe('tool page review/evidence composite state', () => {
  it('composes review artifacts and evidence signals with artifact-derived links', () => {
    const input = {
      reviewArtifacts: {
        canonicalFacts: {
          evidence_links: [{ source: 'Docs', url: 'https://acme.com/docs', confidence: 'high' }],
        },
        reviewSources: [
          {
            source: 'Docs',
            url: 'https://acme.com/docs',
            confidence: 'high',
            kind: 'docs_checked',
          },
        ],
        tool: { name: 'Acme' },
      },
      evidenceSignals: {
        firstReview: {
          pros: ['Fast setup'],
          cons: ['Offline mode is limited'],
          summary_markdown: 'Review summary',
          updated_at: '2026-03-01T00:00:00.000Z',
          created_at: '2026-02-20T00:00:00.000Z',
        },
        toolLastVerifiedAt: '2026-03-01T00:00:00.000Z',
        toolPricingVerifiedAt: '2026-03-01T00:00:00.000Z',
        extractionDate: '2026-03-01',
        constraints: [{ label: 'No SAML on starter' }],
        isEligibleEvidenceUrl: (value: unknown) =>
          typeof value === 'string' && value.includes('acme.com'),
        isDisallowedConClaim: () => false,
        reviewPros: ['Fast setup'],
        reviewCons: ['Offline mode is limited'],
        globalPros: ['Strong docs'],
        globalCons: ['Offline mode is limited'],
        toEvidenceBullet: (value: string) => ({ text: value, source_url: 'https://acme.com/docs' }),
        decisionSnapshotWatchOuts: ['Offline mode limitations'],
        decisionTradeoffSummaryInitial: 'Strong in collaboration, weaker offline.',
        hasPricing: true,
        knowledgeCard: { pricing: { starting_price: 20 } },
        sectionPricingStatus: 'show',
        budgetCostDrivers: ['Per-seat growth'],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: ['Annual discount'],
        budgetRoiThreshold: '10 seats',
        faqItems: [{ question: 'Q', answer: 'A' }],
        buildEvidenceBulletV2: (value: string) => ({
          text: value,
          source_url: 'https://acme.com/docs',
          evidenceLabel: 'docs_checked',
        }),
      },
    } as const;

    const result = buildToolPageReviewEvidenceStateFromRouteContext(input);

    const expectedReviewArtifacts = buildToolPageReviewArtifactsStateFromRouteContext(
      input.reviewArtifacts
    );
    const expectedEvidenceSignals = buildToolPageEvidenceSignalsState(
      buildToolPageEvidenceSignalsStateInputFromRouteContext({
        ...input.evidenceSignals,
        officialEvidenceLinks: expectedReviewArtifacts.officialEvidenceLinks,
        evidenceLinksAll: expectedReviewArtifacts.evidenceLinksAll,
        evidenceLinks: expectedReviewArtifacts.evidenceLinks,
      })
    );

    expect(result.reviewArtifactsState).toEqual(expectedReviewArtifacts);
    expect(result.evidenceSignalsState.reviewSignalsView).toEqual(
      expectedEvidenceSignals.reviewSignalsView
    );
    expect(result.evidenceSignalsState.evidenceRuntime).toEqual(
      expectedEvidenceSignals.evidenceRuntime
    );
  });
});
