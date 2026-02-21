import { describe, expect, it } from 'vitest';
import { deriveFactPackSchemaId } from '@/lib/hunter/fact-pack';

describe('deriveFactPackSchemaId', () => {
  it('prefers explicit category slug', () => {
    const schemaId = deriveFactPackSchemaId({
      categorySlug: 'crm-sales',
      knowledgeCard: {
        pricing: {
          model: 'paid',
          has_free_tier: false,
          has_free_trial: false,
          trial_days: null,
          starting_price: null,
          tiers: [],
        },
        meta: {
          data_quality: 'medium',
          extraction_date: '2026-02-21T00:00:00.000Z',
        },
      } as any,
    });
    expect(schemaId).toBe('crm_sales_v1');
  });

  it('falls back to normalized taxonomy function', () => {
    const schemaId = deriveFactPackSchemaId({
      knowledgeCard: {
        pricing: {
          model: 'paid',
          has_free_tier: false,
          has_free_trial: false,
          trial_days: null,
          starting_price: null,
          tiers: [],
        },
        smp_taxonomy: {
          primary_function: 'Sales CRM',
          secondary_functions: [],
          likely_departments: [],
        },
        meta: {
          data_quality: 'medium',
          extraction_date: '2026-02-21T00:00:00.000Z',
        },
      } as any,
    });
    expect(schemaId).toBe('sales_crm_v1');
  });

  it('uses general fallback when no category signals exist', () => {
    const schemaId = deriveFactPackSchemaId({
      knowledgeCard: {
        pricing: {
          model: 'paid',
          has_free_tier: false,
          has_free_trial: false,
          trial_days: null,
          starting_price: null,
          tiers: [],
        },
        meta: {
          data_quality: 'medium',
          extraction_date: '2026-02-21T00:00:00.000Z',
        },
      } as any,
    });
    expect(schemaId).toBe('general_v1');
  });
});
