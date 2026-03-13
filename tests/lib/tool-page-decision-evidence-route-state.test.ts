import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionEvidenceRouteState } from '@/lib/tool-page/decision-evidence-route-state';

describe('tool page decision evidence route state', () => {
  it('flattens decision and evidence state slices for route orchestration', () => {
    const result = buildToolPageDecisionEvidenceRouteState({
      decisionSectionState: {
        qualityState: { showReviewInProgressBanner: false },
        faqState: { faqItems: [{ question: 'Q1', answer: 'A1' }] },
        displaySignals: { pricingTypeLabel: 'Free' },
        decisionRuntime: { hasVerdict: true },
        sectionFlags: { hasFAQ: true },
        presentationGates: { showProceduralVerdict: false, showProceduralSpecs: false },
        faqSchema: null,
      } as any,
      reviewArtifactsState: { evidenceBasis: [] } as any,
      evidenceSignalsState: {
        reviewSignalsView: { communityVerifiedLabel: 'Verified' },
        evidenceRuntime: { showPricingSection: true },
      } as any,
    });

    expect(result.pricingTypeLabel).toBe('Free');
    expect(result.faqItems.length).toBe(1);
    expect(result.reviewSignalsView.communityVerifiedLabel).toBe('Verified');
    expect(result.evidenceRuntime.showPricingSection).toBe(true);
  });
});
