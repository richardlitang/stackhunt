import type { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision/decision-section-state';

interface BuildToolPageDecisionSectionStateFromRouteInput {
  qualityStateInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['qualityStateInput'];
  faqStateInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['faqStateInput'];
  displaySignalsInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['displaySignalsInput'];
  decisionRuntimeInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['decisionRuntimeInput'];
  sectionRuntimeInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['sectionRuntimeInput'];
  faqSchemaInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['faqSchemaInput'];
}

export function buildToolPageDecisionSectionStateInputFromRoute(
  input: BuildToolPageDecisionSectionStateFromRouteInput
): Parameters<typeof buildToolPageDecisionSectionState>[0] {
  return {
    qualityStateInput: input.qualityStateInput,
    faqStateInput: input.faqStateInput,
    displaySignalsInput: input.displaySignalsInput,
    decisionRuntimeInput: input.decisionRuntimeInput,
    sectionRuntimeInput: input.sectionRuntimeInput,
    faqSchemaInput: input.faqSchemaInput,
  };
}
