interface BuildToolPageVerdictContentInput {
  renderVerdictSafe: string | null | undefined;
}

const GENERIC_VERDICT_PATTERNS = [
  /\bchoose when\b[^.]*\bsupports core workflows\b[^.]*\bdocumented in (?:the )?source\.?/gi,
  /\bsupports core workflows\b.*\bplan limits\b.*\bfeature constraints\b.*\bdocumented in (?:the )?source\b/gi,
];

function removeGenericVerdictCopy(value: string): string {
  return GENERIC_VERDICT_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, '').replace(/\s+\./g, '.'),
    value
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildToolPageVerdictContent(input: BuildToolPageVerdictContentInput): {
  body: string;
} {
  return {
    body: input.renderVerdictSafe ? removeGenericVerdictCopy(input.renderVerdictSafe) : '',
  };
}
