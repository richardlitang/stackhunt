interface BuildToolPageUpdateHistoryStateInput {
  entriesCount: number;
}

export function buildToolPageUpdateHistoryState(
  input: BuildToolPageUpdateHistoryStateInput
): {
  hasUpdates: boolean;
} {
  return {
    hasUpdates: input.entriesCount > 0,
  };
}
