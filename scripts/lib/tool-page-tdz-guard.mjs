const PREP_REVIEW_EVIDENCE_CALL_PATTERN =
  /\bbuildToolPagePrepReviewEvidenceStateFromDecisionContext\s*\(([\s\S]*?)\)\s*;/g;
const EVIDENCE_CONTEXT_BLOCK_PATTERN = /\bevidenceContext\s*:\s*{([\s\S]*?)}/g;
const DISALLOWED_PREP_CONTEXT_IDENTIFIERS = [
  'isDisallowedConClaim',
  'toEvidenceBullet',
  'hasPricing',
  'faqItems',
];

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function preserveNewlinesAsSpaces(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripNoise(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    preserveNewlinesAsSpaces(match)
  );
  const withoutLineComments = withoutBlockComments.replace(/\/\/[^\n\r]*/g, (match) =>
    preserveNewlinesAsSpaces(match)
  );
  return withoutLineComments.replace(
    /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (match) => preserveNewlinesAsSpaces(match)
  );
}

export function findToolPagePrepReviewEvidenceTDZRisks(source) {
  const scanSource = stripNoise(source);
  const findings = [];

  for (const callMatch of scanSource.matchAll(PREP_REVIEW_EVIDENCE_CALL_PATTERN)) {
    const callBody = callMatch[1] || '';
    const callOffset = callMatch.index ?? 0;
    for (const contextMatch of callBody.matchAll(EVIDENCE_CONTEXT_BLOCK_PATTERN)) {
      const contextBody = contextMatch[1] || '';
      const contextOffsetInCall = contextMatch.index ?? 0;
      for (const identifier of DISALLOWED_PREP_CONTEXT_IDENTIFIERS) {
        const identifierRe = new RegExp(`\\b${identifier}\\b`, 'g');
        for (const identifierMatch of contextBody.matchAll(identifierRe)) {
          const absoluteIndex = callOffset + contextOffsetInCall + (identifierMatch.index ?? 0);
          findings.push({
            identifier,
            line: getLineNumber(scanSource, absoluteIndex),
          });
        }
      }
    }
  }

  return findings;
}
