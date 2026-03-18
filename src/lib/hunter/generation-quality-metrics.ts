export interface ActionabilityScoreOptions {
  vetoCount: number;
  switchingCount: number;
  dealbreakerCount: number;
  abstainedCount: number;
  distinctDomains?: number;
}

export interface ReaderUtilityScoreOptions {
  claimTexts: string[];
  decisionIntro?: {
    best_for?: string | null;
    not_for?: string | null;
    main_tradeoff?: string | null;
    summary?: string | null;
  } | null;
  userAdvocate?: {
    avoidIf?: string[];
    frustrations?: string[];
    idealFor?: string[];
  } | null;
  vetoCount: number;
  realityCheckCount: number;
  abstainedCount: number;
}

const CONSTRAINT_SIGNAL_REGEX =
  /\b(no|not|without|only|limit|limited|limits|requires?|supports?|lacks?|max|minimum|quota|overage|tier|plan|api|sso|sla|gdpr|soc ?2|hipaa|export|import|linux|windows|ios|android)\b/i;
const SCENARIO_SIGNAL_REGEX =
  /\b(if|when|unless|team|teams|startup|enterprise|small business|solo|agency|developer|marketer|ops|compliance|budget|rollout|migration|switch)\b/i;
const CONSEQUENCE_SIGNAL_REGEX =
  /\b(blocker|risk|trade[- ]?off|means|impact|forces|requires|cannot|can't|only on|tier|plan|overage|limit)\b/i;

function hasNumericSignal(text: string): boolean {
  return /\d/.test(text);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeActionabilityScore(
  claimTexts: string[],
  options: ActionabilityScoreOptions
): number {
  const totalClaims = Math.max(1, claimTexts.length);
  const numericRatio = claimTexts.filter((text) => hasNumericSignal(text)).length / totalClaims;
  const constraintRatio =
    claimTexts.filter((text) => CONSTRAINT_SIGNAL_REGEX.test(text)).length / totalClaims;
  const diversityScore = options.distinctDomains ? Math.min(options.distinctDomains, 4) / 4 : 0;
  const rawScore =
    numericRatio * 35 +
    constraintRatio * 25 +
    (options.vetoCount > 0 ? 15 : 0) +
    (options.switchingCount > 0 ? 10 : 0) +
    (options.dealbreakerCount > 0 ? 10 : 0) +
    diversityScore * 5;
  const abstentionPenalty = options.abstainedCount * 4;
  return Math.round(clamp(rawScore - abstentionPenalty, 0, 100));
}

export function computeReaderUtilityScore(options: ReaderUtilityScoreOptions): number {
  const claimTexts = options.claimTexts.filter(
    (text) => typeof text === 'string' && text.trim().length > 0
  );
  const totalClaims = Math.max(1, claimTexts.length);
  const scenarioRatio =
    claimTexts.filter((text) => SCENARIO_SIGNAL_REGEX.test(text)).length / totalClaims;
  const consequenceRatio =
    claimTexts.filter((text) => CONSEQUENCE_SIGNAL_REGEX.test(text)).length / totalClaims;
  const hasDecisionIntro = Boolean(
    options.decisionIntro?.best_for &&
    options.decisionIntro?.not_for &&
    options.decisionIntro?.main_tradeoff
  );
  const hasUserAdvocateSignals = Boolean(
    (options.userAdvocate?.avoidIf?.length || 0) > 0 ||
    (options.userAdvocate?.frustrations?.length || 0) > 0 ||
    (options.userAdvocate?.idealFor?.length || 0) > 0
  );
  const rawScore =
    scenarioRatio * 30 +
    consequenceRatio * 25 +
    (hasDecisionIntro ? 20 : 0) +
    (hasUserAdvocateSignals ? 10 : 0) +
    (options.vetoCount > 0 ? 8 : 0) +
    (options.realityCheckCount > 0 ? 7 : 0);
  const abstentionPenalty = options.abstainedCount * 5;
  return Math.round(clamp(rawScore - abstentionPenalty, 0, 100));
}
