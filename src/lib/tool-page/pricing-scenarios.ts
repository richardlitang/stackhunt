import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPagePricingScenariosInput {
  toolName: string;
  hardLimitText: string | null;
  activeReviewLens?: ReviewLens;
}

export interface ToolPagePricingScenarioState {
  examples: string[];
}

export function buildToolPagePricingScenarioState(
  input: BuildToolPagePricingScenariosInput
): ToolPagePricingScenarioState {
  const activeReviewLens = input.activeReviewLens || 'general';
  const hardLimit = (input.hardLimitText || '').trim();
  const seatMatch = hardLimit.match(/\b(\d+)\s*(?:seat|user)s?\b/i);

  if (seatMatch) {
    const threshold = Number(seatMatch[1]);
    if (activeReviewLens === 'enterprise') {
      return {
        examples: [
          `Pilot example: ${threshold} seats may fit initial trial teams, but confirm identity/governance feature gates before procurement.`,
          `${threshold + 1} seats example: expect an upgrade path review tied to enterprise controls and contract scope.`,
        ],
      };
    }
    if (activeReviewLens === 'personal') {
      return {
        examples: [
          `Solo example: ${threshold} seats or fewer can remain on the free/personal tier if required features are included.`,
          `${threshold + 1} seats example: confirm when shared-team use forces a paid plan and workflow handoff changes.`,
        ],
      };
    }
    return {
      examples: [
        `Free tier example: ${threshold} seats or fewer can stay on the free tier if required features are included.`,
        `${threshold + 1} seats example: expect a paid plan requirement once your team crosses the documented seat cap.`,
      ],
    };
  }

  return {
    examples: [
      activeReviewLens === 'enterprise'
        ? 'Enterprise pilot example: verify procurement-bound features (identity, governance, support terms) before broad rollout.'
        : `Small-team example: start with one workspace and map seat growth before rollout.`,
      activeReviewLens === 'personal'
        ? 'Personal-to-team example: confirm when collaboration or admin controls require a paid plan jump.'
        : `Growth example: expect cost changes when seats, workspace count, or plan-gated features increase.`,
    ],
  };
}
