import type { HunterAnalysis } from '../types';

export interface EvalGolden {
  toolName: string;
  minClaimCitationRate: number;
  minActionabilityScore: number;
  minReaderUtilityScore: number;
  maxCoverageGaps: number;
  mustMentionAny: string[][];
  mustNotContain: string[];
  requireDecisionShapedClaims?: boolean;
  maxVerdictCharacters?: number;
}

export interface EvalMetrics {
  claimCitationRate: number;
  actionabilityScore: number | null;
  readerUtilityScore: number | null;
  coverageGaps: string[];
  promptVersions: Record<string, string> | null;
}

export function claimCitationRate(analysis: Partial<HunterAnalysis>): number {
  const claims = [...(analysis.pros || []), ...(analysis.cons || [])];
  if (claims.length === 0) {
    return 0;
  }

  const cited = claims.filter((claim) => {
    if (!claim || typeof claim === 'string') {
      return false;
    }

    return typeof claim.source_url === 'string' && claim.source_url.trim().length > 0;
  });

  return cited.length / claims.length;
}

export function reviewText(analysis: Partial<HunterAnalysis>): string {
  const claims = [...(analysis.pros || []), ...(analysis.cons || [])]
    .map((claim) => (typeof claim === 'string' ? claim : claim?.text || ''))
    .filter((claim) => claim.trim().length > 0)
    .join('\n');

  return `${analysis.summary || ''}\n${claims}`.toLowerCase();
}

function claimText(claim: HunterAnalysis['pros'][number]): string {
  return typeof claim === 'string' ? claim : claim?.text || '';
}

function isSingleSentence(text: string): boolean {
  const sentenceEndings = text.match(/[.!?](?=\s|$)/g) || [];
  return sentenceEndings.length === 1 && /[.!?]$/.test(text.trim());
}

function isDecisionShaped(text: string): boolean {
  const normalized = text.trim();
  const namesScenario =
    /^(best for|not for|can(?:not|'t)|choose (?:when|if)|avoid (?:when|if)|teams? (?:that|who)|organizations? (?:that|who))/i.test(
      normalized
    );
  const namesConsequence =
    /\b(because|so that|which means|without|unless|when|if|requires?|cannot|can't|limits?|blocks?|adds?|costs?)\b/i.test(
      normalized
    );
  return namesScenario && namesConsequence;
}

export function scoreAnalysisAgainstGolden(input: {
  analysis: Partial<HunterAnalysis>;
  golden: EvalGolden;
  quality: {
    actionabilityScore?: number | null;
    readerUtilityScore?: number | null;
    promptVersions?: Record<string, string> | null;
  };
  coverageGaps: string[];
}): { failures: string[]; metrics: EvalMetrics } {
  const metrics: EvalMetrics = {
    claimCitationRate: claimCitationRate(input.analysis),
    actionabilityScore: input.quality.actionabilityScore ?? null,
    readerUtilityScore: input.quality.readerUtilityScore ?? null,
    coverageGaps: input.coverageGaps,
    promptVersions: input.quality.promptVersions ?? null,
  };

  const text = reviewText(input.analysis);
  const failures: string[] = [];

  if (metrics.claimCitationRate < input.golden.minClaimCitationRate) {
    failures.push(
      `citation rate ${metrics.claimCitationRate.toFixed(2)} < ${input.golden.minClaimCitationRate}`
    );
  }
  if ((metrics.actionabilityScore ?? 0) < input.golden.minActionabilityScore) {
    failures.push(
      `actionability ${metrics.actionabilityScore} < ${input.golden.minActionabilityScore}`
    );
  }
  if ((metrics.readerUtilityScore ?? 0) < input.golden.minReaderUtilityScore) {
    failures.push(
      `reader utility ${metrics.readerUtilityScore} < ${input.golden.minReaderUtilityScore}`
    );
  }
  if (metrics.coverageGaps.length > input.golden.maxCoverageGaps) {
    failures.push(
      `coverage gaps [${metrics.coverageGaps.join(',')}] > ${input.golden.maxCoverageGaps}`
    );
  }

  for (const group of input.golden.mustMentionAny) {
    if (!group.some((phrase) => text.includes(phrase.toLowerCase()))) {
      failures.push(`missing all of: ${group.join(' | ')}`);
    }
  }
  for (const banned of input.golden.mustNotContain) {
    if (text.includes(banned.toLowerCase())) {
      failures.push(`contains banned phrase: ${banned}`);
    }
  }

  if (input.golden.requireDecisionShapedClaims) {
    for (const [groupName, claims] of [
      ['pros', input.analysis.pros || []],
      ['cons', input.analysis.cons || []],
    ] as const) {
      claims.forEach((claim, index) => {
        const text = claimText(claim);
        if (!isSingleSentence(text)) {
          failures.push(`${groupName}[${index}] must be one sentence`);
        }
        if (!isDecisionShaped(text)) {
          failures.push(`${groupName}[${index}] must name a buyer scenario and consequence`);
        }
      });
    }
  }

  const maxVerdictCharacters = input.golden.maxVerdictCharacters;
  if (
    maxVerdictCharacters !== undefined &&
    typeof input.analysis.verdict === 'string' &&
    input.analysis.verdict.length > maxVerdictCharacters
  ) {
    failures.push(`verdict exceeds ${maxVerdictCharacters} characters`);
  }

  return { failures, metrics };
}
