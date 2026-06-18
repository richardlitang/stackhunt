export interface ToolPageSetupSignalsInput {
  knowledgeCard: {
    setup_complexity?: {
      steps?: unknown;
      estimated_setup_time?: unknown;
      setup_url?: unknown;
    } | null;
  } | null;
  setupTracks?: {
    dev?: unknown;
    non_dev?: unknown;
  } | null;
  website?: string | null;
}

export interface ToolPageSetupSignals {
  hasSetupComplexityContent: boolean;
  hasNonDevTrackContent: boolean;
  hasDevTrackContent: boolean;
  hasGettingStarted: boolean;
  gettingStartedCtaUrl: string | null;
}

function hasMeaningfulStepAction(step: unknown): boolean {
  if (!step || typeof step !== 'object') return false;
  const action = (step as Record<string, unknown>).action;
  return typeof action === 'string' && action.trim().length >= 6;
}

export function deriveToolPageSetupSignals(input: ToolPageSetupSignalsInput): ToolPageSetupSignals {
  const setupComplexity = input.knowledgeCard?.setup_complexity;
  const hasSetupComplexityContent = Boolean(
    setupComplexity &&
    ((Array.isArray(setupComplexity.steps) &&
      setupComplexity.steps.some((step) => hasMeaningfulStepAction(step))) ||
      (typeof setupComplexity.estimated_setup_time === 'string' &&
        setupComplexity.estimated_setup_time.trim().length > 0) ||
      Boolean(setupComplexity.setup_url))
  );
  const hasNonDevTrackContent = Array.isArray(input.setupTracks?.non_dev)
    ? input.setupTracks.non_dev.some((step) => hasMeaningfulStepAction(step))
    : false;
  const hasDevTrackContent = Array.isArray(input.setupTracks?.dev)
    ? input.setupTracks.dev.some((step) => hasMeaningfulStepAction(step))
    : false;

  return {
    hasSetupComplexityContent,
    hasNonDevTrackContent,
    hasDevTrackContent,
    hasGettingStarted: hasSetupComplexityContent || hasNonDevTrackContent || hasDevTrackContent,
    gettingStartedCtaUrl:
      (typeof setupComplexity?.setup_url === 'string' && setupComplexity.setup_url) ||
      input.website ||
      null,
  };
}
