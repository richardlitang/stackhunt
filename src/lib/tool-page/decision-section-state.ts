import { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import { buildToolPageDecisionRuntimeInput } from '@/lib/tool-page/decision-runtime-input';
import { buildToolPageDisplaySignals } from '@/lib/tool-page/display-signals';
import { buildToolPageFaqSchema } from '@/lib/tool-page/faq-schema';
import { buildToolPageFaqState } from '@/lib/tool-page/faq';
import { buildToolPagePresentationGates } from '@/lib/tool-page/presentation-gates';
import { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import { buildToolPageQualityStateInput } from '@/lib/tool-page/quality-state-input';
import { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import { buildToolPageSectionRuntime } from '@/lib/tool-page/section-runtime';
import { buildToolPageSectionRuntimeInput } from '@/lib/tool-page/section-runtime-input';

interface BuildToolPageDecisionSectionStateInput {
  qualityStateInput: Parameters<typeof buildToolPageQualityStateInput>[0];
  faqStateInput: Parameters<typeof buildToolPageFaqState>[0];
  displaySignalsInput: Parameters<typeof buildToolPageDisplaySignals>[0];
  decisionRuntimeInput: Omit<
    Parameters<typeof buildToolPageDecisionRuntimeInput>[0],
    'sectionStatus' | 'renderVerdict'
  >;
  sectionRuntimeInput: Omit<
    Parameters<typeof buildToolPageSectionRuntimeInput>[0],
    | 'faqItems'
    | 'sectionPublishabilityFaq'
    | 'sectionStatus'
    | 'contentConfidenceLevel'
    | 'hasGettingStartedData'
  >;
  faqSchemaInput: Omit<
    Parameters<typeof buildToolPageFaqSchema>[0],
    'hasFAQ' | 'knowledgeCardForSeo'
  >;
}

type ToolPageFaqSchemaKnowledgeInput = Parameters<
  typeof buildToolPageFaqSchema
>[0]['knowledgeCardForSeo'];

export function buildToolPageDecisionSectionState(input: BuildToolPageDecisionSectionStateInput): {
  qualityState: ReturnType<typeof buildToolPageQualityState>;
  faqState: ReturnType<typeof buildToolPageFaqState>;
  displaySignals: ReturnType<typeof buildToolPageDisplaySignals>;
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionRuntime: ReturnType<typeof buildToolPageSectionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  presentationGates: ReturnType<typeof buildToolPagePresentationGates>;
  faqSchema: ReturnType<typeof buildToolPageFaqSchema>;
} {
  const qualityState = buildToolPageQualityState(
    buildToolPageQualityStateInput(input.qualityStateInput)
  );
  const faqState = buildToolPageFaqState(input.faqStateInput);
  const displaySignals = buildToolPageDisplaySignals(input.displaySignalsInput);
  const decisionRuntime = buildToolPageDecisionRuntime(
    buildToolPageDecisionRuntimeInput({
      ...input.decisionRuntimeInput,
      sectionStatus: {
        pricing: qualityState.sectionStatus.pricing || 'hide',
        verdict: qualityState.sectionStatus.verdict || 'hide',
      },
      renderVerdict: displaySignals.renderVerdict,
    })
  );
  const sectionRuntime = buildToolPageSectionRuntime(
    buildToolPageSectionRuntimeInput({
      ...input.sectionRuntimeInput,
      faqItems: faqState.faqItems,
      sectionPublishabilityFaq: qualityState.sectionPublishability.faq,
      sectionStatus: {
        specs: qualityState.sectionStatus.specs || 'hide',
        community: qualityState.sectionStatus.community || 'hide',
      },
      contentConfidenceLevel: qualityState.contentConfidenceLevel,
      hasGettingStartedData: decisionRuntime.hasGettingStartedRaw,
    })
  );
  const sectionFlags = buildToolPageSectionFlags(sectionRuntime);
  const presentationGates = buildToolPagePresentationGates({
    hasProceduralGuidance: qualityState.hasProceduralGuidance,
    sectionStatus: {
      verdict: qualityState.sectionStatus.verdict || 'hide',
      specs: qualityState.sectionStatus.specs || 'hide',
    },
    hasVerdict: decisionRuntime.hasVerdict,
    hasSpecs: sectionFlags.hasSpecs,
  });
  const faqSchema = buildToolPageFaqSchema({
    ...input.faqSchemaInput,
    hasFAQ: sectionFlags.hasFAQ,
    knowledgeCardForSeo: faqState.knowledgeCardForSeo as ToolPageFaqSchemaKnowledgeInput,
  });

  return {
    qualityState,
    faqState,
    displaySignals,
    decisionRuntime,
    sectionRuntime,
    sectionFlags,
    presentationGates,
    faqSchema,
  };
}
