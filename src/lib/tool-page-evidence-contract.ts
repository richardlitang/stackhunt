export type ToolPageType = 'tool_review';

export type ToolEvaluationDepth = 'docs_only' | 'hands_on' | 'mixed';

export type ToolFactSourceType =
  | 'official_doc'
  | 'official_pricing'
  | 'hands_on_test'
  | 'independent_high_trust'
  | 'community_signal'
  | 'editorial_inference'
  | 'unknown';

export type ToolFactConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface ToolPageEvidenceContract {
  pageType: ToolPageType;
  primaryIntent: string;
  evaluationDepth: ToolEvaluationDepth;
  factFields: string[];
  sourceTypeByField: Record<string, ToolFactSourceType>;
  confidenceByField: Record<string, ToolFactConfidence>;
  lastCheckedByField: Record<string, string | null>;
  sectionReasonCodes: string[];
  sectionOmissionReasons: Record<string, string>;
}

interface CreateToolPageEvidenceContractInput {
  primaryIntent?: string;
  evaluationDepth?: string | null;
  factFields?: string[] | null;
  sourceTypeByField?: Record<string, unknown> | null;
  confidenceByField?: Record<string, unknown> | null;
  lastCheckedByField?: Record<string, unknown> | null;
  sectionReasonCodes?: string[] | null;
  sectionOmissionReasons?: Record<string, unknown> | null;
}

const DEFAULT_PRIMARY_INTENT = 'tool review';

const DEFAULT_FACT_FIELDS = [
  'summary',
  'best_for',
  'not_for',
  'pricing',
  'alternatives',
  'evidence',
];

const VALID_SOURCE_TYPES = new Set<ToolFactSourceType>([
  'official_doc',
  'official_pricing',
  'hands_on_test',
  'independent_high_trust',
  'community_signal',
  'editorial_inference',
  'unknown',
]);

const VALID_CONFIDENCE = new Set<ToolFactConfidence>(['high', 'medium', 'low', 'unknown']);

export function normalizeToolEvaluationDepth(value: string | null | undefined): ToolEvaluationDepth {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'hands_on' || normalized === 'hands-on') return 'hands_on';
  if (normalized === 'mixed' || normalized === 'docs_and_hands_on') return 'mixed';
  return 'docs_only';
}

function normalizeSourceType(value: unknown): ToolFactSourceType {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  return VALID_SOURCE_TYPES.has(normalized as ToolFactSourceType)
    ? (normalized as ToolFactSourceType)
    : 'unknown';
}

function normalizeConfidence(value: unknown): ToolFactConfidence {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  return VALID_CONFIDENCE.has(normalized as ToolFactConfidence)
    ? (normalized as ToolFactConfidence)
    : 'unknown';
}

function normalizeDateString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function createToolPageEvidenceContract(
  input: CreateToolPageEvidenceContractInput = {}
): ToolPageEvidenceContract {
  const factFields =
    Array.isArray(input.factFields) && input.factFields.length > 0
      ? input.factFields.filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
      : DEFAULT_FACT_FIELDS;

  const sourceTypeByField = Object.fromEntries(
    factFields.map((field) => [
      field,
      normalizeSourceType(input.sourceTypeByField?.[field] ?? 'unknown'),
    ])
  );

  const confidenceByField = Object.fromEntries(
    factFields.map((field) => [
      field,
      normalizeConfidence(input.confidenceByField?.[field] ?? 'unknown'),
    ])
  );

  const lastCheckedByField = Object.fromEntries(
    factFields.map((field) => [field, normalizeDateString(input.lastCheckedByField?.[field])])
  );

  return {
    pageType: 'tool_review',
    primaryIntent:
      typeof input.primaryIntent === 'string' && input.primaryIntent.trim().length > 0
        ? input.primaryIntent.trim()
        : DEFAULT_PRIMARY_INTENT,
    evaluationDepth: normalizeToolEvaluationDepth(input.evaluationDepth),
    factFields,
    sourceTypeByField,
    confidenceByField,
    lastCheckedByField,
    sectionReasonCodes: Array.isArray(input.sectionReasonCodes)
      ? input.sectionReasonCodes.filter(
          (reason): reason is string => typeof reason === 'string' && reason.trim().length > 0
        )
      : [],
    sectionOmissionReasons: input.sectionOmissionReasons
      ? Object.fromEntries(
          Object.entries(input.sectionOmissionReasons).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === 'string' &&
              entry[0].trim().length > 0 &&
              typeof entry[1] === 'string' &&
              entry[1].trim().length > 0
          )
        )
      : {},
  };
}
