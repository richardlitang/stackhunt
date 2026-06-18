export type ToolPageEvaluationDepth = 'Docs-only' | 'Light hands-on' | 'Deep hands-on';

export interface BuildToolPageEvaluationInput {
  canonicalFacts: Record<string, unknown> | undefined;
}

export interface ToolPageEvaluationViewModel {
  handsOnChecks: string[];
  handsOnTestEnvironment: string | null;
  handsOnTestSteps: string[];
  handsOnTestFindings: string[];
  handsOnTestedAtLabel: string | null;
  hasHandsOnTestNotes: boolean;
  evaluationDepth: ToolPageEvaluationDepth;
  testedItems: string[];
  notTestedItems: string[];
  showWeTestedIt: boolean;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
}

export function buildToolPageEvaluationViewModel(
  input: BuildToolPageEvaluationInput
): ToolPageEvaluationViewModel {
  const handsOnChecks = toStringArray(input.canonicalFacts?.hands_on_checks).slice(0, 6);
  const handsOnTestNotesRaw =
    input.canonicalFacts?.hands_on_test_notes &&
    typeof input.canonicalFacts.hands_on_test_notes === 'object'
      ? (input.canonicalFacts.hands_on_test_notes as Record<string, unknown>)
      : null;
  const handsOnTestEnvironment =
    typeof handsOnTestNotesRaw?.environment === 'string' ? handsOnTestNotesRaw.environment : null;
  const handsOnTestSteps = toStringArray(handsOnTestNotesRaw?.steps).slice(0, 8);
  const handsOnTestFindings = toStringArray(handsOnTestNotesRaw?.findings).slice(0, 8);
  const handsOnTestedAtLabel = (() => {
    if (typeof handsOnTestNotesRaw?.tested_at !== 'string') return null;
    const parsed = new Date(handsOnTestNotesRaw.tested_at);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();
  const hasHandsOnTestNotes = Boolean(
    handsOnTestEnvironment ||
    handsOnTestSteps.length > 0 ||
    handsOnTestFindings.length > 0 ||
    handsOnTestedAtLabel
  );
  const evaluationDepth: ToolPageEvaluationDepth =
    handsOnChecks.length >= 3
      ? 'Deep hands-on'
      : handsOnChecks.length > 0
        ? 'Light hands-on'
        : 'Docs-only';
  const testedItems =
    evaluationDepth === 'Docs-only'
      ? [
          'Official docs/help pages reviewed',
          'Official pricing pages reviewed',
          'Source dates checked',
        ]
      : handsOnChecks;
  const notTestedItems =
    evaluationDepth === 'Docs-only'
      ? [
          'Live product workflow execution',
          'Account-level setup in production environments',
          'Contract-specific terms (SSO, SCIM, DPA, audit-log gating)',
        ]
      : ['Enterprise contract and legal terms unless explicitly stated in cited vendor docs'];
  const showWeTestedIt = evaluationDepth !== 'Docs-only' || hasHandsOnTestNotes;

  return {
    handsOnChecks,
    handsOnTestEnvironment,
    handsOnTestSteps,
    handsOnTestFindings,
    handsOnTestedAtLabel,
    hasHandsOnTestNotes,
    evaluationDepth,
    testedItems,
    notTestedItems,
    showWeTestedIt,
  };
}
