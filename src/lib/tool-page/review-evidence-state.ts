import { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence-signals-state';
import { buildToolPageEvidenceSignalsStateInputFromRouteContext } from '@/lib/tool-page/evidence-signals-route-input';
import { buildToolPageReviewArtifactsStateFromRouteContext } from '@/lib/tool-page/review-artifacts-state';

interface BuildToolPageReviewEvidenceStateFromRouteContextInput {
  reviewArtifacts: Parameters<typeof buildToolPageReviewArtifactsStateFromRouteContext>[0];
  evidenceSignals: Omit<
    Parameters<typeof buildToolPageEvidenceSignalsStateInputFromRouteContext>[0],
    'officialEvidenceLinks' | 'evidenceLinksAll' | 'evidenceLinks'
  >;
}

export function buildToolPageReviewEvidenceStateFromRouteContext(
  input: BuildToolPageReviewEvidenceStateFromRouteContextInput
): {
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsStateFromRouteContext>;
  evidenceSignalsState: ReturnType<typeof buildToolPageEvidenceSignalsState>;
} {
  const reviewArtifactsState = buildToolPageReviewArtifactsStateFromRouteContext(
    input.reviewArtifacts
  );

  const evidenceSignalsState = buildToolPageEvidenceSignalsState(
    buildToolPageEvidenceSignalsStateInputFromRouteContext({
      ...input.evidenceSignals,
      officialEvidenceLinks: reviewArtifactsState.officialEvidenceLinks,
      evidenceLinksAll: reviewArtifactsState.evidenceLinksAll,
      evidenceLinks: reviewArtifactsState.evidenceLinks,
    })
  );

  return { reviewArtifactsState, evidenceSignalsState };
}
