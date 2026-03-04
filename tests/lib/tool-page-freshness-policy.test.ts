import { describe, expect, it } from 'vitest';
import {
  applyToolPageFreshnessPolicy,
  deriveToolPageFollowupJob,
} from '@/lib/tool-page/freshness-policy';
import { createToolPageEvidenceContract } from '@/lib/tool-page/evidence-contract';

describe('tool-page freshness policy', () => {
  it('downgrades stale pricing field and emits price_only follow-up', () => {
    const contract = createToolPageEvidenceContract({
      factFields: ['pricing'],
      confidenceByField: { pricing: 'high' },
      lastCheckedByField: { pricing: '2025-01-01T00:00:00.000Z' },
    });

    const result = applyToolPageFreshnessPolicy(contract, new Date('2026-03-02T00:00:00.000Z'));
    expect(result.staleFields).toContain('pricing');
    expect(result.contract.confidenceByField.pricing).toBe('unknown');
    expect(result.omissionReasons.pricing).toBe('stale_gt_14d');

    const followup = deriveToolPageFollowupJob(result.omissionReasons);
    expect(followup?.huntType).toBe('price_only');
  });

  it('routes mixed omissions to refresh follow-up', () => {
    const followup = deriveToolPageFollowupJob({
      pricing: 'stale_gt_14d',
      alternatives: 'missing_source_backed_data',
    });
    expect(followup?.huntType).toBe('refresh');
    expect(followup?.reasonCodes.length).toBe(2);
  });
});
