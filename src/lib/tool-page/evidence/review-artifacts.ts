import { buildToolPageEvaluationViewModel } from '@/lib/tool-page/shared/evaluation';
import { buildToolPageEvidenceLinks } from '@/lib/tool-page/evidence/evidence-links';

interface BuildToolPageReviewArtifactsInput {
  canonicalFacts: Record<string, unknown> | undefined;
  reviewSources: Array<Record<string, unknown> | null | undefined>;
  toolName: string;
}

export function buildToolPageReviewArtifacts(input: BuildToolPageReviewArtifactsInput): {
  evaluationViewModel: ReturnType<typeof buildToolPageEvaluationViewModel>;
  evidenceLinksViewModel: ReturnType<typeof buildToolPageEvidenceLinks>;
} {
  return {
    evaluationViewModel: buildToolPageEvaluationViewModel({
      canonicalFacts: input.canonicalFacts,
    }),
    evidenceLinksViewModel: buildToolPageEvidenceLinks(input.reviewSources, input.toolName),
  };
}
