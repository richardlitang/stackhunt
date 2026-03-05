interface BuildToolPagePricingScenariosInput {
  toolName: string;
  hardLimitText: string | null;
}

export interface ToolPagePricingScenarioState {
  examples: string[];
}

export function buildToolPagePricingScenarioState(
  input: BuildToolPagePricingScenariosInput
): ToolPagePricingScenarioState {
  const hardLimit = (input.hardLimitText || '').trim();
  const seatMatch = hardLimit.match(/\b(\d+)\s*(?:seat|user)s?\b/i);

  if (seatMatch) {
    const threshold = Number(seatMatch[1]);
    return {
      examples: [
        `Free tier example: ${threshold} seats or fewer can stay on the free tier if required features are included.`,
        `${threshold + 1} seats example: expect a paid plan requirement once your team crosses the documented seat cap.`,
      ],
    };
  }

  return {
    examples: [
      `Small-team example: start with one workspace and map seat growth before rollout.`,
      `Growth example: expect cost changes when seats, workspace count, or plan-gated features increase.`,
    ],
  };
}
