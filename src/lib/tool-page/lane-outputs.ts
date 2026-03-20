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
    pricing_reality?: {
      free_works_if: string | null;
      paid_needed_when: string | null;
      hidden_cost_triggers: string[];
      main_cost_drivers: string[];
    };
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
    main_risk?: string | null;
    upgrade_trigger?: string | null;
    implementation_friction_level?: 'low' | 'medium' | 'high' | null;
    implementation_friction_drivers?: string[];
    implementation_friction_stakeholders?: string[];
    fit_matrix?: {
      solo: {
        fit: 'weak' | 'mixed' | 'strong';
        caveat: string | null;
        reason: string | null;
      } | null;
      startup: {
        fit: 'weak' | 'mixed' | 'strong';
        caveat: string | null;
        reason: string | null;
      } | null;
      mid_market: {
        fit: 'weak' | 'mixed' | 'strong';
        caveat: string | null;
        reason: string | null;
      } | null;
      enterprise: {
        fit: 'weak' | 'mixed' | 'strong';
        caveat: string | null;
        reason: string | null;
      } | null;
    };
    test_before_buy?: Array<{
      name: string;
      why_it_matters: string | null;
      test: string | null;
      pass_condition: string | null;
      common_failure: string | null;
    }>;
    alternatives_rebuttals?: Array<{
      slug: string;
      tool_name: string;
      choose_instead_if: string | null;
      differentiator:
        | 'cheaper_at_scale'
        | 'faster_setup'
        | 'deeper_automation'
        | 'stronger_governance'
        | 'better_developer_control'
        | 'better_reporting'
        | 'workflow_fit';
      confidence: 'high' | 'medium' | 'low';
    }>;
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
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
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

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function toDifferentiatorOrWorkflow(
  value: unknown
):
  | 'cheaper_at_scale'
  | 'faster_setup'
  | 'deeper_automation'
  | 'stronger_governance'
  | 'better_developer_control'
  | 'better_reporting'
  | 'workflow_fit' {
  if (
    value === 'cheaper_at_scale' ||
    value === 'faster_setup' ||
    value === 'deeper_automation' ||
    value === 'stronger_governance' ||
    value === 'better_developer_control' ||
    value === 'better_reporting'
  ) {
    return value;
  }
  return 'workflow_fit';
}

function toConfidenceOrMedium(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}

function toFitRow(
  value: unknown
): { fit: 'weak' | 'mixed' | 'strong'; caveat: string | null; reason: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const fit = row.fit;
  if (fit !== 'weak' && fit !== 'mixed' && fit !== 'strong') return null;
  return {
    fit,
    caveat: toStringOrNull(row.caveat),
    reason: toStringOrNull(row.reason),
  };
}

function toTestBeforeBuy(value: unknown): Array<{
  name: string;
  why_it_matters: string | null;
  test: string | null;
  pass_condition: string | null;
  common_failure: string | null;
}> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      if (typeof row.name !== 'string' || row.name.trim().length === 0) return null;
      return {
        name: row.name.trim(),
        why_it_matters: toStringOrNull(row.why_it_matters),
        test: toStringOrNull(row.test),
        pass_condition: toStringOrNull(row.pass_condition),
        common_failure: toStringOrNull(row.common_failure),
      };
    })
    .filter(
      (
        row
      ): row is {
        name: string;
        why_it_matters: string | null;
        test: string | null;
        pass_condition: string | null;
        common_failure: string | null;
      } => Boolean(row)
    )
    .slice(0, 3);
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
  const pricingReality =
    factSheet.pricing_reality && typeof factSheet.pricing_reality === 'object'
      ? (factSheet.pricing_reality as Record<string, unknown>)
      : null;
  const fitMatrix =
    editorial.fit_matrix && typeof editorial.fit_matrix === 'object'
      ? (editorial.fit_matrix as Record<string, unknown>)
      : null;

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
      ...(pricingReality
        ? {
            pricing_reality: {
              free_works_if: toStringOrNull(pricingReality.free_works_if),
              paid_needed_when: toStringOrNull(pricingReality.paid_needed_when),
              hidden_cost_triggers: toStringArray(pricingReality.hidden_cost_triggers),
              main_cost_drivers: toStringArray(pricingReality.main_cost_drivers),
            },
          }
        : {}),
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
      main_risk: toStringOrNull(editorial.main_risk),
      upgrade_trigger: toStringOrNull(editorial.upgrade_trigger),
      implementation_friction_level:
        editorial.implementation_friction_level === 'low' ||
        editorial.implementation_friction_level === 'medium' ||
        editorial.implementation_friction_level === 'high'
          ? editorial.implementation_friction_level
          : null,
      implementation_friction_drivers: toStringArray(editorial.implementation_friction_drivers),
      implementation_friction_stakeholders: toStringArray(
        editorial.implementation_friction_stakeholders
      ),
      ...(fitMatrix
        ? {
            fit_matrix: {
              solo: toFitRow(fitMatrix.solo),
              startup: toFitRow(fitMatrix.startup),
              mid_market: toFitRow(fitMatrix.mid_market),
              enterprise: toFitRow(fitMatrix.enterprise),
            },
          }
        : {}),
      test_before_buy: toTestBeforeBuy(editorial.test_before_buy),
      alternatives_rebuttals: Array.isArray(editorial.alternatives_rebuttals)
        ? editorial.alternatives_rebuttals
            .map((entry) => {
              if (!entry || typeof entry !== 'object') return null;
              const row = entry as Record<string, unknown>;
              if (typeof row.slug !== 'string' || row.slug.trim().length === 0) return null;
              if (typeof row.tool_name !== 'string' || row.tool_name.trim().length === 0)
                return null;
              return {
                slug: row.slug.trim(),
                tool_name: row.tool_name.trim(),
                choose_instead_if: toStringOrNull(row.choose_instead_if),
                differentiator: toDifferentiatorOrWorkflow(row.differentiator),
                confidence: toConfidenceOrMedium(row.confidence),
              };
            })
            .filter(
              (
                row
              ): row is {
                slug: string;
                tool_name: string;
                choose_instead_if: string | null;
                differentiator:
                  | 'cheaper_at_scale'
                  | 'faster_setup'
                  | 'deeper_automation'
                  | 'stronger_governance'
                  | 'better_developer_control'
                  | 'better_reporting'
                  | 'workflow_fit';
                confidence: 'high' | 'medium' | 'low';
              } => Boolean(row)
            )
            .slice(0, 6)
        : [],
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
