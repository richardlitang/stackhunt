interface AlternativeEvidenceDiff {
  priceDiff?: string;
  learningDiff?: string;
  featureDiff?: string;
}

export type AlternativeEvidenceLevel = 'evidence_backed' | 'model_derived' | 'needs_confirmation';

interface ResolveAlternativeEvidenceLevelInput {
  curatedVerdict?: string | null;
  computedDiff?: AlternativeEvidenceDiff | null;
}

export function resolveAlternativeEvidenceLevel(
  input: ResolveAlternativeEvidenceLevelInput
): AlternativeEvidenceLevel {
  if (input.curatedVerdict) return 'evidence_backed';
  const hasComputedSignal = Boolean(
    input.computedDiff?.priceDiff ||
    input.computedDiff?.learningDiff ||
    input.computedDiff?.featureDiff
  );
  if (hasComputedSignal) return 'model_derived';
  return 'needs_confirmation';
}

export function labelAlternativeEvidenceLevel(level: AlternativeEvidenceLevel): string {
  if (level === 'evidence_backed') return 'Evidence-backed rationale';
  if (level === 'model_derived') return 'Model-derived signal, verify in docs';
  return 'Needs confirmation';
}

export function labelAlternativeEvidenceLevelForGrid(level: AlternativeEvidenceLevel): string {
  if (level === 'evidence_backed') return 'Source-backed';
  if (level === 'model_derived') return 'Heuristic';
  return 'Pending verification';
}

export function formatAlternativeEvidenceDate(isoDate?: string | null): string | null {
  if (!isoDate) return null;
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
