export interface BuildToolPageDecisionSnapshotInput {
  decisionSlotsRaw: Record<string, unknown> | null;
  decisionIntroRaw: Record<string, unknown> | null;
  fallbackDecisionSummary: string;
  idealFor: unknown[];
  guardedAvoidIf: unknown[];
  isPaymentsCategory: boolean;
  paymentTriggerCons: string[];
  fallbackConsText: string[];
  firstReviewPros: unknown[];
  firstReviewCons: unknown[];
  tagAudienceNames: string[];
  isDisallowedConClaim: (text: string) => boolean;
  cleanNarrativeText: (value: unknown) => string | null;
  cleanDecisionSlotText: (
    value: unknown,
    slot: 'best_fit' | 'weak_fit' | 'tradeoff'
  ) => string | null;
  uniqueDecisionText: (items: Array<unknown>) => string[];
}

export interface ToolPageDecisionSnapshot {
  decisionSnapshotSummary: string;
  introLooksSpecSheet: boolean;
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummaryInitial: string;
}

export function buildToolPageFallbackDecisionSummary(
  _toolName: string,
  shortDescription: string | null | undefined,
  tagline: string | null | undefined
): string {
  return shortDescription || tagline || '';
}

export function deriveToolPageDecisionDifferentiators(
  uniqueFeatures: unknown[] | null | undefined,
  coreFeatures: unknown[] | null | undefined,
  uniqueDecisionText: (items: Array<unknown>) => string[]
): string[] {
  return uniqueDecisionText([
    ...(Array.isArray(uniqueFeatures) ? uniqueFeatures : []),
    ...(Array.isArray(coreFeatures) ? coreFeatures : []),
  ]).slice(0, 2);
}

export function buildToolPageDecisionSnapshot(
  input: BuildToolPageDecisionSnapshotInput
): ToolPageDecisionSnapshot {
  const decisionIntroWhatItIs = input.cleanNarrativeText(
    (input.decisionSlotsRaw?.what_it_is as string | undefined) ?? input.decisionIntroRaw?.what_it_is
  );
  const decisionIntroBestFor = input.cleanDecisionSlotText(
    (input.decisionSlotsRaw?.best_fit as string | undefined) ?? input.decisionIntroRaw?.best_for,
    'best_fit'
  );
  const decisionIntroNotForRaw = input.cleanDecisionSlotText(
    (input.decisionSlotsRaw?.weak_fit as string | undefined) ?? input.decisionIntroRaw?.not_for,
    'weak_fit'
  );
  const decisionIntroNotFor =
    decisionIntroNotForRaw && !input.isDisallowedConClaim(decisionIntroNotForRaw)
      ? decisionIntroNotForRaw
      : '';
  const decisionIntroTradeoffRaw = input.cleanDecisionSlotText(
    (input.decisionSlotsRaw?.tradeoff as string | undefined) ??
      input.decisionIntroRaw?.main_tradeoff,
    'tradeoff'
  );
  const decisionIntroTradeoff =
    decisionIntroTradeoffRaw && !input.isDisallowedConClaim(decisionIntroTradeoffRaw)
      ? decisionIntroTradeoffRaw
      : '';

  const decisionSnapshotSummaryCandidate = decisionIntroWhatItIs || input.fallbackDecisionSummary;
  const introLooksSpecSheet = /\bacross pricing,\s*fit,\s*and rollout risk\b/i.test(
    decisionSnapshotSummaryCandidate
  );
  const decisionSnapshotSummary = introLooksSpecSheet
    ? input.fallbackDecisionSummary
    : decisionSnapshotSummaryCandidate;

  const decisionSnapshotBestWhen = input
    .uniqueDecisionText(
      decisionIntroBestFor
        ? [decisionIntroBestFor, ...input.idealFor]
        : input.idealFor.length > 0
          ? input.idealFor
          : []
    )
    .slice(0, 3);

  const decisionSnapshotWatchOutCandidates = input.uniqueDecisionText(
    decisionIntroNotFor
      ? [decisionIntroNotFor, ...input.guardedAvoidIf]
      : input.guardedAvoidIf.length > 0
        ? input.guardedAvoidIf.slice(0, 2)
        : []
  );

  const decisionSnapshotWatchOuts = decisionSnapshotWatchOutCandidates
    .filter((item) => !input.isDisallowedConClaim(item))
    .slice(0, 3);

  return {
    decisionSnapshotSummary,
    introLooksSpecSheet,
    decisionSnapshotBestWhen,
    decisionSnapshotWatchOuts,
    decisionTradeoffSummaryInitial: decisionIntroTradeoff || '',
  };
}
