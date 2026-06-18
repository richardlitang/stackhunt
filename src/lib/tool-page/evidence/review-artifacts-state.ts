import { buildToolPageReviewArtifacts } from '@/lib/tool-page/evidence/review-artifacts';

interface BuildToolPageReviewArtifactsStateInput {
  canonicalFacts: Parameters<typeof buildToolPageReviewArtifacts>[0]['canonicalFacts'];
  reviewSources: Parameters<typeof buildToolPageReviewArtifacts>[0]['reviewSources'];
  toolName: string;
}

export function buildToolPageReviewArtifactsState(input: BuildToolPageReviewArtifactsStateInput): {
  evaluationViewModel: ReturnType<typeof buildToolPageReviewArtifacts>['evaluationViewModel'];
  evidenceLinksViewModel: ReturnType<typeof buildToolPageReviewArtifacts>['evidenceLinksViewModel'];
  handsOnTestEnvironment: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['handsOnTestEnvironment'];
  handsOnTestSteps: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['handsOnTestSteps'];
  handsOnTestFindings: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['handsOnTestFindings'];
  handsOnTestedAtLabel: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['handsOnTestedAtLabel'];
  evaluationDepth: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['evaluationDepth'];
  testedItems: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['testedItems'];
  notTestedItems: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['notTestedItems'];
  showWeTestedIt: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evaluationViewModel']['showWeTestedIt'];
  evidenceLinksAll: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evidenceLinksViewModel']['evidenceLinksAll'];
  evidenceLinks: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evidenceLinksViewModel']['evidenceLinks'];
  lowConfidenceEvidenceLinks: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evidenceLinksViewModel']['lowConfidenceEvidenceLinks'];
  evidenceBasis: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evidenceLinksViewModel']['evidenceBasis'];
  officialEvidenceLinks: ReturnType<
    typeof buildToolPageReviewArtifacts
  >['evidenceLinksViewModel']['officialEvidenceLinks'];
} {
  const reviewArtifacts = buildToolPageReviewArtifacts({
    canonicalFacts: input.canonicalFacts,
    reviewSources: input.reviewSources,
    toolName: input.toolName,
  });

  const evaluationViewModel = reviewArtifacts.evaluationViewModel;
  const evidenceLinksViewModel = reviewArtifacts.evidenceLinksViewModel;

  return {
    evaluationViewModel,
    evidenceLinksViewModel,
    handsOnTestEnvironment: evaluationViewModel.handsOnTestEnvironment,
    handsOnTestSteps: evaluationViewModel.handsOnTestSteps,
    handsOnTestFindings: evaluationViewModel.handsOnTestFindings,
    handsOnTestedAtLabel: evaluationViewModel.handsOnTestedAtLabel,
    evaluationDepth: evaluationViewModel.evaluationDepth,
    testedItems: evaluationViewModel.testedItems,
    notTestedItems: evaluationViewModel.notTestedItems,
    showWeTestedIt: evaluationViewModel.showWeTestedIt,
    evidenceLinksAll: evidenceLinksViewModel.evidenceLinksAll,
    evidenceLinks: evidenceLinksViewModel.evidenceLinks,
    lowConfidenceEvidenceLinks: evidenceLinksViewModel.lowConfidenceEvidenceLinks,
    evidenceBasis: evidenceLinksViewModel.evidenceBasis,
    officialEvidenceLinks: evidenceLinksViewModel.officialEvidenceLinks,
  };
}
