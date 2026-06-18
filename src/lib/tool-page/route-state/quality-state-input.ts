import type { buildToolPageQualityState } from '@/lib/tool-page/shared/quality-state';
import type { Tool } from '@/types/database';

interface BuildToolPageQualityStateInputContext {
  tool: Tool;
  firstReview: Parameters<typeof buildToolPageQualityState>[0]['firstReview'];
  reviewSelection: Parameters<typeof buildToolPageQualityState>[0]['reviewSelection'];
  canonicalFacts: Record<string, unknown> | null | undefined;
  resolvedSubject?: Parameters<typeof buildToolPageQualityState>[0]['resolvedSubject'];
  subjectSelectionSuppressed?: Parameters<
    typeof buildToolPageQualityState
  >[0]['subjectSelectionSuppressed'];
  subjectSelectionReason?: Parameters<
    typeof buildToolPageQualityState
  >[0]['subjectSelectionReason'];
  laneOutputs?: Parameters<typeof buildToolPageQualityState>[0]['laneOutputs'];
}

export function buildToolPageQualityStateInput(
  input: BuildToolPageQualityStateInputContext
): Parameters<typeof buildToolPageQualityState>[0] {
  const persistedQuality =
    (input.canonicalFacts?.quality as
      | {
          should_index?: boolean;
          noindex_reasons?: string[];
          section_publishability?: Record<string, boolean>;
          section_status?: Record<string, 'show' | 'hide' | 'procedural'>;
          evidence_counts?: Record<string, number>;
        }
      | undefined) || undefined;

  return {
    tool: input.tool,
    firstReview: input.firstReview,
    reviewSelection: input.reviewSelection,
    persistedQuality,
    resolvedSubject: input.resolvedSubject,
    subjectSelectionSuppressed: input.subjectSelectionSuppressed,
    subjectSelectionReason: input.subjectSelectionReason,
    laneOutputs: input.laneOutputs,
  };
}
