import type { ReviewLens } from '@/lib/tool-page/view-model';

export interface ToolPageLensWorkflowCard {
  title: string;
  body: string;
}

export interface BuildToolPageLensContentInput {
  activeReviewLens: ReviewLens;
  toolName: string;
  hasCollectedSources: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
  hasSecurity: boolean;
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionSnapshotDifferentiators: string[];
  decisionTradeoffSummary: string;
  enterpriseTradeoffOverride: string | null;
  hardLimitCount: number;
}

export interface ToolPageLensContent {
  verdictLabelRationale: string;
  reviewDek: string;
  readerFocusNote: string | null;
  lensBestFitLine: string;
  lensWeakFitLine: string;
  lensTradeoffLine: string;
  scoreDrivers: string[];
  workflowFitHighlights: string[];
  workflowFitCards: ToolPageLensWorkflowCard[];
}

function uniqueDecisionText(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function buildToolPageLensContent(input: BuildToolPageLensContentInput): ToolPageLensContent {
  const verdictLabel =
    input.decisionSnapshotWatchOuts.length === 0 && input.hardLimitCount <= 1
      ? 'Choose'
      : input.decisionSnapshotBestWhen.length > 0
        ? 'Consider'
        : 'Avoid';

  const verdictLabelRationale =
    verdictLabel === 'Choose'
      ? input.hasCollectedSources
        ? `${input.toolName} is a strong fit when its confirmed strengths match your day-to-day workflow.`
        : `${input.toolName} appears promising, but core sourcing is still being completed.`
      : verdictLabel === 'Consider'
        ? `${input.toolName} could fit, but the decision usually depends on plan limits, integration fit, and rollout constraints.`
        : input.hasCollectedSources
          ? `${input.toolName} is not a confident recommendation yet based on currently verified evidence.`
          : `${input.toolName} is not a confident recommendation yet because source-backed evidence is still limited.`;

  const reviewDekByLens: Record<ReviewLens, string> = {
    general: 'Pricing, tradeoffs, best for, and alternatives.',
    personal: 'Quick setup, free-tier reality, and first-use fit.',
    startup: 'Team workflow fit, pricing growth, and rollout constraints.',
    enterprise: 'Controls, trust posture, and procurement-critical tradeoffs.',
  };

  const readerFocusNoteByLens: Partial<Record<ReviewLens, string>> = {
    personal: 'Prioritizes setup speed, free-tier clarity, and early usability.',
    startup: 'Prioritizes team workflow fit and how costs scale as seats or usage grow.',
    enterprise: 'Prioritizes controls, risk, and procurement-facing constraints.',
  };

  const lensBestFitLine = (() => {
    if (input.activeReviewLens === 'personal') {
      return input.hasGettingStarted
        ? 'People who want a fast self-serve start and clear day-one workflow.'
        : input.decisionSnapshotBestWhen[0] || 'Not confirmed';
    }
    if (input.activeReviewLens === 'startup') {
      return input.showPricingSection
        ? 'Teams balancing capability gains against seat or usage growth.'
        : input.decisionSnapshotBestWhen[0] || 'Not confirmed';
    }
    if (input.activeReviewLens === 'enterprise') {
      return input.hasSecurity
        ? 'Teams requiring admin controls, governance clarity, and source-backed rollout planning.'
        : input.decisionSnapshotBestWhen[0] || 'Not confirmed';
    }
    return input.decisionSnapshotBestWhen[0] || 'Not confirmed';
  })();

  const lensWeakFitLine = (() => {
    if (input.activeReviewLens === 'personal') {
      return input.decisionSnapshotWatchOuts[0] || 'Buyers who need contract-heavy enterprise controls.';
    }
    if (input.activeReviewLens === 'startup') {
      return (
        input.decisionSnapshotWatchOuts[0] ||
        'Teams without clear ownership of plan limits, usage growth, and budget controls.'
      );
    }
    if (input.activeReviewLens === 'enterprise') {
      return (
        input.decisionSnapshotWatchOuts[0] ||
        'Organizations that require contract/security terms not yet confirmed in cited sources.'
      );
    }
    return input.decisionSnapshotWatchOuts[0] || 'Not confirmed';
  })();

  const lensTradeoffLine =
    input.activeReviewLens === 'enterprise' && input.enterpriseTradeoffOverride
      ? input.enterpriseTradeoffOverride
      : input.decisionTradeoffSummary;

  const scoreDrivers = uniqueDecisionText([
    ...input.decisionSnapshotDifferentiators,
    ...input.decisionSnapshotBestWhen,
  ]).slice(0, 5);

  const workflowFitHighlights = uniqueDecisionText([
    ...input.decisionSnapshotBestWhen,
    ...input.decisionSnapshotDifferentiators,
    ...scoreDrivers,
  ]).slice(0, 3);

  const workflowFitCards: ToolPageLensWorkflowCard[] = [
    {
      title: 'Day-one usability',
      body: input.hasGettingStarted
        ? 'Start with one high-frequency workflow, then confirm setup and first-output quality before expanding usage.'
        : 'Treat onboarding as a validation sprint: run one real task from start to finish before broad adoption.',
    },
    {
      title: 'Team rollout shape',
      body: input.showPricingSection
        ? 'Model seat and usage growth early. Teams usually see fewer surprises when plan limits, admin ownership, and integration scope are set before rollout.'
        : 'Model expected team usage before rollout. Plan-gated capabilities and integration scope should be confirmed early.',
    },
    {
      title: 'Operational constraints',
      body:
        lensTradeoffLine && lensTradeoffLine !== 'Not confirmed'
          ? `Primary constraint to monitor: ${lensTradeoffLine}`
          : 'Primary constraint to monitor: verify rollout dependencies in docs and pricing sources before committing.',
    },
  ];

  return {
    verdictLabelRationale,
    reviewDek: reviewDekByLens[input.activeReviewLens],
    readerFocusNote: readerFocusNoteByLens[input.activeReviewLens] || null,
    lensBestFitLine,
    lensWeakFitLine,
    lensTradeoffLine,
    scoreDrivers,
    workflowFitHighlights,
    workflowFitCards,
  };
}
