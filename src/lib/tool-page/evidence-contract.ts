export type ToolPageEvaluationDepth = 'docs_only' | 'hands_on';
export type ToolPageFieldConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface ToolPageEvidenceContractInput {
  factFields?: string[];
  evaluationDepth?: ToolPageEvaluationDepth;
  confidenceByField?: Record<string, ToolPageFieldConfidence | string | null | undefined>;
  lastCheckedByField?: Record<string, string | null | undefined>;
}

export interface ToolPageEvidenceContract {
  factFields: string[];
  evaluationDepth: ToolPageEvaluationDepth;
  confidenceByField: Record<string, ToolPageFieldConfidence>;
  lastCheckedByField: Record<string, string | null>;
}

const DEFAULT_FACT_FIELDS = ['evidence'];

function normalizeConfidence(value: string | null | undefined): ToolPageFieldConfidence {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : 'unknown';
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
  return 'unknown';
}

function normalizeCheckedAt(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function createToolPageEvidenceContract(
  input: ToolPageEvidenceContractInput = {}
): ToolPageEvidenceContract {
  const confidenceByFieldInput = input.confidenceByField || {};
  const lastCheckedByFieldInput = input.lastCheckedByField || {};

  const fieldSet = new Set<string>();
  const explicitFactFields = Array.isArray(input.factFields)
    ? input.factFields.filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
    : [];
  for (const field of explicitFactFields) fieldSet.add(field.trim());
  for (const field of Object.keys(confidenceByFieldInput)) fieldSet.add(field);
  for (const field of Object.keys(lastCheckedByFieldInput)) fieldSet.add(field);
  if (fieldSet.size === 0) DEFAULT_FACT_FIELDS.forEach((field) => fieldSet.add(field));

  const factFields = Array.from(fieldSet);
  const confidenceByField: Record<string, ToolPageFieldConfidence> = {};
  const lastCheckedByField: Record<string, string | null> = {};

  for (const field of factFields) {
    confidenceByField[field] = normalizeConfidence(confidenceByFieldInput[field]);
    lastCheckedByField[field] = normalizeCheckedAt(lastCheckedByFieldInput[field]);
  }

  return {
    factFields,
    evaluationDepth: input.evaluationDepth === 'hands_on' ? 'hands_on' : 'docs_only',
    confidenceByField,
    lastCheckedByField,
  };
}
