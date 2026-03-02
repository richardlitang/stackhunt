import {
  normalizeToolEvaluationDepth,
  type ToolEvaluationDepth,
} from '@/lib/tool-page-evidence-contract';

export interface ToolPageQaGateInput {
  title: string;
  h1: string;
  intro: string;
  verdict: string;
  evaluationDepth: ToolEvaluationDepth | string;
  pricingSectionVisible: boolean;
  hasPricingCheckedProof: boolean;
  schemaMatchesVisibleContent: boolean;
}

export interface ToolPageQaGateResult {
  pass: boolean;
  blockers: string[];
  warnings: string[];
  metrics: {
    genericPhraseHits: number;
    experientialClaimHits: number;
    titleIntent: string;
    h1Intent: string;
  };
}

const GENERIC_VERDICT_PATTERNS = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities\b/i,
  /\bstrong option based on the current source-backed evidence\b/i,
];

const EXPERIENTIAL_PHRASES = [
  /\bfeels fast\b/i,
  /\bgreat dx\b/i,
  /\bintuitive ui\b/i,
  /\bwe loved\b/i,
  /\bworks flawlessly\b/i,
];

function inferIntent(value: string): 'review' | 'compare' | 'category' | 'pricing' | 'unknown' {
  const lower = value.toLowerCase();
  if (/\breview\b/.test(lower)) return 'review';
  if (/\b(vs|versus|compare)\b/.test(lower)) return 'compare';
  if (/\bbest\b/.test(lower)) return 'category';
  if (/\bpricing\b/.test(lower) && !/\breview\b/.test(lower)) return 'pricing';
  return 'unknown';
}

function countRegexHits(input: string, patterns: RegExp[]): number {
  return patterns.reduce((count, pattern) => (pattern.test(input) ? count + 1 : count), 0);
}

export function evaluateToolPageQaGate(input: ToolPageQaGateInput): ToolPageQaGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const combinedText = `${input.intro}\n${input.verdict}`;

  const titleIntent = inferIntent(input.title);
  const h1Intent = inferIntent(input.h1);
  if (titleIntent !== 'unknown' && h1Intent !== 'unknown' && titleIntent !== h1Intent) {
    blockers.push(`intent_mismatch:title_${titleIntent}_h1_${h1Intent}`);
  }

  const genericPhraseHits = countRegexHits(combinedText, GENERIC_VERDICT_PATTERNS);
  if (genericPhraseHits > 0) blockers.push('generic_verdict_phrase_detected');

  if (input.pricingSectionVisible && !input.hasPricingCheckedProof) {
    blockers.push('pricing_visible_without_checked_proof');
  }

  if (!input.schemaMatchesVisibleContent) {
    blockers.push('schema_visible_content_mismatch');
  }

  const normalizedDepth = normalizeToolEvaluationDepth(input.evaluationDepth);
  const experientialClaimHits = countRegexHits(combinedText, EXPERIENTIAL_PHRASES);
  if (normalizedDepth === 'docs_only' && experientialClaimHits > 0) {
    blockers.push('docs_only_experiential_claim');
  }
  if (normalizedDepth === 'mixed') {
    const hasMixedLabel = /\b(mixed|docs\s*\+\s*testing|docs and testing)\b/i.test(combinedText);
    if (!hasMixedLabel) {
      warnings.push('mixed_depth_label_missing');
    }
  }

  return {
    pass: blockers.length === 0,
    blockers,
    warnings,
    metrics: {
      genericPhraseHits,
      experientialClaimHits,
      titleIntent,
      h1Intent,
    },
  };
}
