import type { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence/evidence-signals-state';

interface BuildToolPageEvidenceSignalsStateFromRouteInput {
  reviewSignalsInput: Parameters<typeof buildToolPageEvidenceSignalsState>[0]['reviewSignalsInput'];
  constraintEvidenceInput: Parameters<
    typeof buildToolPageEvidenceSignalsState
  >[0]['constraintEvidenceInput'];
  evidenceRuntimeInput: Parameters<
    typeof buildToolPageEvidenceSignalsState
  >[0]['evidenceRuntimeInput'];
}

export function buildToolPageEvidenceSignalsStateInputFromRoute(
  input: BuildToolPageEvidenceSignalsStateFromRouteInput
): Parameters<typeof buildToolPageEvidenceSignalsState>[0] {
  return {
    reviewSignalsInput: input.reviewSignalsInput,
    constraintEvidenceInput: input.constraintEvidenceInput,
    evidenceRuntimeInput: input.evidenceRuntimeInput,
  };
}
