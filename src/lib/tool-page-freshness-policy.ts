import type { HuntType } from '@/types/database';
import type { ToolPageEvidenceContract } from '@/lib/tool-page-evidence-contract';

export const TOOL_PAGE_FIELD_TTL_DAYS: Record<string, number> = {
  summary: 30,
  best_for: 30,
  not_for: 30,
  pricing: 14,
  alternatives: 30,
  evidence: 30,
};

export interface FreshnessPolicyResult {
  contract: ToolPageEvidenceContract;
  staleFields: string[];
  omissionReasons: Record<string, string>;
}

export interface ToolPageFollowupJob {
  huntType: HuntType;
  priority: number;
  reasonCodes: string[];
}

function isOlderThanDays(dateValue: string | null, ttlDays: number, nowMs: number): boolean {
  if (!dateValue) return true;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return true;
  const ageMs = nowMs - parsed;
  return ageMs > ttlDays * 24 * 60 * 60 * 1000;
}

export function applyToolPageFreshnessPolicy(
  contract: ToolPageEvidenceContract,
  now: Date = new Date()
): FreshnessPolicyResult {
  const nowMs = now.getTime();
  const next: ToolPageEvidenceContract = {
    ...contract,
    sectionReasonCodes: [...contract.sectionReasonCodes],
    confidenceByField: { ...contract.confidenceByField },
    sectionOmissionReasons: { ...contract.sectionOmissionReasons },
    lastCheckedByField: { ...contract.lastCheckedByField },
  };

  const staleFields: string[] = [];
  for (const field of contract.factFields) {
    const ttlDays = TOOL_PAGE_FIELD_TTL_DAYS[field];
    if (!ttlDays) continue;
    const lastChecked = contract.lastCheckedByField[field] ?? null;
    if (!isOlderThanDays(lastChecked, ttlDays, nowMs)) continue;

    staleFields.push(field);
    next.confidenceByField[field] = 'unknown';
    next.sectionOmissionReasons[field] = `stale_gt_${ttlDays}d`;
    const reasonCode = `stale:${field}`;
    if (!next.sectionReasonCodes.includes(reasonCode)) {
      next.sectionReasonCodes.push(reasonCode);
    }
  }

  return {
    contract: next,
    staleFields,
    omissionReasons: { ...next.sectionOmissionReasons },
  };
}

export function deriveToolPageFollowupJob(
  omissionReasons: Record<string, string>
): ToolPageFollowupJob | null {
  const keys = Object.keys(omissionReasons);
  if (keys.length === 0) return null;

  const pricingRelated = keys.filter((field) => field === 'pricing');
  const nonPricing = keys.filter((field) => field !== 'pricing');
  if (pricingRelated.length > 0 && nonPricing.length === 0) {
    return {
      huntType: 'price_only',
      priority: 82,
      reasonCodes: pricingRelated.map((field) => `${field}:${omissionReasons[field]}`),
    };
  }

  return {
    huntType: 'refresh',
    priority: 72,
    reasonCodes: keys.map((field) => `${field}:${omissionReasons[field]}`),
  };
}
