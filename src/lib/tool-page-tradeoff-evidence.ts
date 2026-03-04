import {
  buildToolPageEvidenceBulletV2,
  type ToolPageEvidenceBulletV2,
} from '@/lib/tool-page-evidence-bullets';
import { isEligibleEvidenceUrl } from '@/lib/tool-page-evidence-policy';

export interface ToolPageHardLimitLike {
  text: string;
  sourceUrl?: string | null;
}

interface BuildToolPageTradeoffEvidenceInput {
  decisionSnapshotWatchOuts: string[];
  canonicalHardLimits: ToolPageHardLimitLike[];
  topHardLimit: ToolPageHardLimitLike | null;
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingVerifiedLabel: string | null;
}

export interface ToolPageTradeoffEvidence {
  avoidIfBullet: ToolPageEvidenceBulletV2 | null;
  tradeoffCons: ToolPageEvidenceBulletV2[];
}

function uniqueText(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = typeof item === 'string' ? item.trim() : '';
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function buildToolPageTradeoffEvidence(
  input: BuildToolPageTradeoffEvidenceInput
): ToolPageTradeoffEvidence {
  const retrievedAt =
    input.communityVerifiedLabel || input.specsVerifiedLabel || input.pricingVerifiedLabel || undefined;

  const avoidIfBullet = buildToolPageEvidenceBulletV2({
    text: input.decisionSnapshotWatchOuts[0] || 'Your workflow cannot tolerate unresolved constraints.',
    kind: 'tradeoff',
    requiredSourcing: true,
    sourceUrl: input.topHardLimit?.sourceUrl || null,
    sourceLabel: input.topHardLimit ? 'Hard limit source' : undefined,
    retrievedAt,
    isEligibleEvidenceUrl,
  });

  const hardLimitByText = new Map(
    input.canonicalHardLimits.map((entry) => [entry.text, entry] as const)
  );

  const tradeoffCons = uniqueText([
    ...input.decisionSnapshotWatchOuts,
    ...input.canonicalHardLimits.map((item) => item.text),
  ])
    .slice(0, 2)
    .map((text) => {
      const matchedLimit = hardLimitByText.get(text);
      return buildToolPageEvidenceBulletV2({
        text,
        kind: 'tradeoff',
        requiredSourcing: true,
        sourceUrl: matchedLimit?.sourceUrl || null,
        sourceLabel: matchedLimit ? 'Source' : undefined,
        retrievedAt,
        isEligibleEvidenceUrl,
      });
    })
    .filter((item): item is ToolPageEvidenceBulletV2 => Boolean(item));

  return {
    avoidIfBullet,
    tradeoffCons,
  };
}
