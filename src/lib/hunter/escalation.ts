/**
 * Synthesis quality-escalation policy.
 *
 * The analysis phase synthesizes a review at the QUALITY model tier. When the
 * resulting generation-quality signals are weak, it retries once at the
 * ESCALATION tier and keeps whichever attempt scores higher. This module holds
 * the (named, not inline-magic) thresholds and the pure decision/scoring
 * functions so they can be unit-tested without a live model.
 *
 * @module hunter/escalation
 */
import type { SynthesisGenerationQuality } from './services/gemini';
import {
  DEFAULT_MIN_ACTIONABILITY_SCORE,
  DEFAULT_MIN_READER_UTILITY_SCORE,
} from './coverage/coverage-gaps';

export interface EscalationTriggerConfig {
  /** Escalate when mean claim confidence drops below this. */
  minMeanConfidence: number;
  /** Escalate when the low-confidence claim ratio exceeds this. */
  maxLowConfidenceRatio: number;
  /** Escalate when at least this many fields were auto-abstained. */
  minAbstainedFields: number;
  /** Escalate when actionability is below the draft-forcing floor. */
  minActionabilityScore: number;
  /** Escalate when reader utility is below the draft-forcing floor. */
  minReaderUtilityScore: number;
}

export const ESCALATION_TRIGGERS: EscalationTriggerConfig = {
  minMeanConfidence: 0.55,
  maxLowConfidenceRatio: 0.4,
  minAbstainedFields: 3,
  // Mirror the persistence draft-forcing floors so escalation targets the
  // failure mode that actually demotes a review to draft (single source of
  // truth in coverage/coverage-gaps.ts).
  minActionabilityScore: DEFAULT_MIN_ACTIONABILITY_SCORE,
  minReaderUtilityScore: DEFAULT_MIN_READER_UTILITY_SCORE,
};

export interface SynthesisEscalationDecision {
  escalate: boolean;
  reasons: string[];
}

/**
 * Decide whether a synthesis result is weak enough to warrant one escalation
 * retry. Returns the human-readable reasons so the orchestrator can log them.
 * Signals are only trusted when the stage-1 fact pass ran.
 */
export function shouldEscalateSynthesis(
  quality: SynthesisGenerationQuality,
  config: EscalationTriggerConfig = ESCALATION_TRIGGERS
): SynthesisEscalationDecision {
  if (!quality.stage1Enabled) return { escalate: false, reasons: [] };

  const reasons: string[] = [];
  if (
    typeof quality.meanConfidence === 'number' &&
    quality.meanConfidence < config.minMeanConfidence
  ) {
    reasons.push(
      `mean_confidence ${quality.meanConfidence.toFixed(2)} < ${config.minMeanConfidence}`
    );
  }
  if (
    typeof quality.lowConfidenceRatio === 'number' &&
    quality.lowConfidenceRatio > config.maxLowConfidenceRatio
  ) {
    reasons.push(
      `low_conf_ratio ${quality.lowConfidenceRatio.toFixed(2)} > ${config.maxLowConfidenceRatio}`
    );
  }
  if (quality.abstainedFields.length >= config.minAbstainedFields) {
    reasons.push(
      `abstained_fields ${quality.abstainedFields.length} >= ${config.minAbstainedFields}`
    );
  }
  if (
    typeof quality.actionabilityScore === 'number' &&
    quality.actionabilityScore < config.minActionabilityScore
  ) {
    reasons.push(`actionability ${quality.actionabilityScore} < ${config.minActionabilityScore}`);
  }
  if (
    typeof quality.readerUtilityScore === 'number' &&
    quality.readerUtilityScore < config.minReaderUtilityScore
  ) {
    reasons.push(`reader_utility ${quality.readerUtilityScore} < ${config.minReaderUtilityScore}`);
  }

  return { escalate: reasons.length > 0, reasons };
}

/**
 * Composite signal score for picking the better of two synthesis attempts.
 * Higher is better: rewards confident, well-sourced, actionable output and
 * penalizes low-confidence claims and abstained fields. Used only for relative
 * comparison between two attempts on the same input, not as an absolute gate.
 */
export function synthesisQualityScore(quality: SynthesisGenerationQuality): number {
  const meanConfidence = quality.meanConfidence ?? 0;
  const lowConfidenceRatio = quality.lowConfidenceRatio ?? 0;
  const actionability = quality.actionabilityScore ?? 0;
  const readerUtility = quality.readerUtilityScore ?? 0;
  const abstained = quality.abstainedFields.length;
  return (
    meanConfidence - lowConfidenceRatio + (actionability + readerUtility) / 200 - abstained * 0.1
  );
}
