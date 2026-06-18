import type { ToolPageEvidenceContract } from '@/lib/tool-page/evidence/evidence-contract';

export interface ToolPageFreshnessPolicyResult {
  contract: ToolPageEvidenceContract;
  staleFields: string[];
  omissionReasons: Record<string, string>;
}

export interface ToolPageFollowupJob {
  huntType: 'price_only' | 'refresh';
  reasonCodes: string[];
}

const DEFAULT_STALE_WINDOW_DAYS = 30;
const STALE_WINDOWS_BY_FIELD: Record<string, number> = {
  pricing: 14,
};

function resolveWindowDays(field: string): number {
  return STALE_WINDOWS_BY_FIELD[field] || DEFAULT_STALE_WINDOW_DAYS;
}

function getAgeDays(checkedAt: string, now: Date): number | null {
  const parsed = new Date(checkedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const ageMs = now.getTime() - parsed.getTime();
  if (ageMs < 0) return 0;
  return Math.floor(ageMs / (24 * 60 * 60 * 1000));
}

export function applyToolPageFreshnessPolicy(
  contract: ToolPageEvidenceContract,
  now = new Date()
): ToolPageFreshnessPolicyResult {
  const staleFields: string[] = [];
  const omissionReasons: Record<string, string> = {};
  const nextContract: ToolPageEvidenceContract = {
    ...contract,
    confidenceByField: { ...contract.confidenceByField },
    lastCheckedByField: { ...contract.lastCheckedByField },
  };

  for (const field of contract.factFields) {
    const checkedAt = contract.lastCheckedByField[field];
    if (!checkedAt) continue;
    const ageDays = getAgeDays(checkedAt, now);
    if (ageDays === null) continue;
    const maxAgeDays = resolveWindowDays(field);
    if (ageDays > maxAgeDays) {
      staleFields.push(field);
      nextContract.confidenceByField[field] = 'unknown';
      omissionReasons[field] = `stale_gt_${maxAgeDays}d`;
    }
  }

  return {
    contract: nextContract,
    staleFields,
    omissionReasons,
  };
}

export function deriveToolPageFollowupJob(
  omissionReasons: Record<string, string>
): ToolPageFollowupJob | null {
  const entries = Object.entries(omissionReasons);
  if (entries.length === 0) return null;

  const isPricingOnly = entries.every(([field]) => field === 'pricing');
  return {
    huntType: isPricingOnly ? 'price_only' : 'refresh',
    reasonCodes: entries.map(([field, reason]) => `${field}:${reason}`),
  };
}
