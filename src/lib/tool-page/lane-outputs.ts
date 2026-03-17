import type { Tool } from '@/types/database';

export interface ToolPageLaneClaim {
  text: string;
  source_url?: string | null;
  source_type?: 'official' | 'editorial' | 'community' | null;
  claim_type?: 'fact' | 'opinion' | null;
}

export interface ToolPageLaneOutputs {
  subject_profile: {
    subject_type: 'product' | 'product_surface' | 'plan_family' | 'deployment_mode';
    subject_key: string;
    display_name: string;
    entity_scope?: 'core' | 'copilot' | 'actions' | 'enterprise_cloud' | 'enterprise_server' | null;
    confidence: 'high' | 'medium' | 'low';
  };
  fact_sheet: {
    official_facts: ToolPageLaneClaim[];
    official_pricing_facts: ToolPageLaneClaim[];
    official_limit_facts: ToolPageLaneClaim[];
  };
  user_signal_sheet: {
    user_signal_pros: ToolPageLaneClaim[];
    user_signal_cons: ToolPageLaneClaim[];
  };
  editorial_decision: {
    summary: string | null;
    best_for: string | null;
    not_for: string | null;
    main_tradeoff: string | null;
    human_verdict: string | null;
  };
}

const SUBJECT_TYPES = new Set<ToolPageLaneOutputs['subject_profile']['subject_type']>([
  'product',
  'product_surface',
  'plan_family',
  'deployment_mode',
]);

const SUBJECT_CONFIDENCE_LEVELS = new Set<ToolPageLaneOutputs['subject_profile']['confidence']>([
  'high',
  'medium',
  'low',
]);

function normalizeLaneSubjectType(
  value: unknown
): ToolPageLaneOutputs['subject_profile']['subject_type'] {
  return typeof value === 'string' &&
    SUBJECT_TYPES.has(value as ToolPageLaneOutputs['subject_profile']['subject_type'])
    ? (value as ToolPageLaneOutputs['subject_profile']['subject_type'])
    : 'product';
}

function normalizeLaneSubjectConfidence(
  value: unknown
): ToolPageLaneOutputs['subject_profile']['confidence'] {
  return typeof value === 'string' &&
    SUBJECT_CONFIDENCE_LEVELS.has(value as ToolPageLaneOutputs['subject_profile']['confidence'])
    ? (value as ToolPageLaneOutputs['subject_profile']['confidence'])
    : 'medium';
}

function normalizeLaneEntityScope(
  value: unknown
): ToolPageLaneOutputs['subject_profile']['entity_scope'] {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    normalized === 'core' ||
    normalized === 'copilot' ||
    normalized === 'actions' ||
    normalized === 'enterprise_cloud' ||
    normalized === 'enterprise_server'
  ) {
    return normalized;
  }
  return null;
}

function isClaimArray(value: unknown): value is ToolPageLaneClaim[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) => entry && typeof entry === 'object' && typeof (entry as any).text === 'string'
    )
  );
}

export function readToolPageLaneOutputs(tool: Tool): ToolPageLaneOutputs | null {
  const specs =
    tool?.specs && typeof tool.specs === 'object' ? (tool.specs as Record<string, unknown>) : null;
  const canonical =
    specs?.canonical && typeof specs.canonical === 'object'
      ? (specs.canonical as Record<string, unknown>)
      : null;
  const raw = canonical?.entity_first_lane_outputs;
  if (!raw || typeof raw !== 'object') return null;
  const outputs = raw as Record<string, unknown>;
  const subject = outputs.subject_profile as Record<string, unknown> | undefined;
  const factSheet = outputs.fact_sheet as Record<string, unknown> | undefined;
  const userSignalSheet = outputs.user_signal_sheet as Record<string, unknown> | undefined;
  const editorial = outputs.editorial_decision as Record<string, unknown> | undefined;
  if (!subject || typeof subject.subject_key !== 'string') return null;
  if (!factSheet || !userSignalSheet || !editorial) return null;

  const officialFacts = isClaimArray(factSheet.official_facts) ? factSheet.official_facts : [];
  const officialPricingFacts = isClaimArray(factSheet.official_pricing_facts)
    ? factSheet.official_pricing_facts
    : [];
  const officialLimitFacts = isClaimArray(factSheet.official_limit_facts)
    ? factSheet.official_limit_facts
    : [];
  const userSignalPros = isClaimArray(userSignalSheet.user_signal_pros)
    ? userSignalSheet.user_signal_pros
    : [];
  const userSignalCons = isClaimArray(userSignalSheet.user_signal_cons)
    ? userSignalSheet.user_signal_cons
    : [];

  return {
    subject_profile: {
      subject_type: normalizeLaneSubjectType(subject.subject_type),
      subject_key: subject.subject_key,
      display_name: typeof subject.display_name === 'string' ? subject.display_name : tool.name,
      entity_scope: normalizeLaneEntityScope(subject.entity_scope),
      confidence: normalizeLaneSubjectConfidence(subject.confidence),
    },
    fact_sheet: {
      official_facts: officialFacts,
      official_pricing_facts: officialPricingFacts,
      official_limit_facts: officialLimitFacts,
    },
    user_signal_sheet: {
      user_signal_pros: userSignalPros,
      user_signal_cons: userSignalCons,
    },
    editorial_decision: {
      summary: typeof editorial.summary === 'string' ? editorial.summary : null,
      best_for: typeof editorial.best_for === 'string' ? editorial.best_for : null,
      not_for: typeof editorial.not_for === 'string' ? editorial.not_for : null,
      main_tradeoff: typeof editorial.main_tradeoff === 'string' ? editorial.main_tradeoff : null,
      human_verdict: typeof editorial.human_verdict === 'string' ? editorial.human_verdict : null,
    },
  };
}

export function countToolPageLaneUserSignals(laneOutputs: ToolPageLaneOutputs | null): number {
  if (!laneOutputs) return 0;
  return (
    laneOutputs.user_signal_sheet.user_signal_pros.length +
    laneOutputs.user_signal_sheet.user_signal_cons.length
  );
}
