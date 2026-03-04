interface BuildToolPageVerdictContentInput {
  renderVerdictSafe: string | null | undefined;
}

export function buildToolPageVerdictContent(input: BuildToolPageVerdictContentInput): {
  body: string;
} {
  return {
    body: input.renderVerdictSafe || '',
  };
}
