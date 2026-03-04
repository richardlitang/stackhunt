import { describe, expect, it } from 'vitest';
import { buildToolPageQualityState } from '@/lib/tool-page/quality-state';

describe('tool page quality state', () => {
  it('merges persisted quality overrides and computes draft/index flags', () => {
    const tool = {
      name: 'Acme',
      short_description: 'Acme helps teams automate workflows with clear controls and auditability.',
      metadata: { features: { core: ['Automation'] } },
      specs: {},
      learning_curve: 'hours',
      avg_score: 80,
      review_count: 2,
      view_count: 100,
    } as any;
    const firstReview = {
      status: 'published',
      updated_at: '2026-03-01T00:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
      summary_markdown: 'Strong operational fit with caveats.',
      pros: ['Fast setup'],
      cons: ['Needs admin ownership'],
      sources: [{ url: 'https://example.com/docs' }],
      score: 75,
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview,
      reviewSelection: {
        hasPublishedReview: true,
        hasDraftReview: false,
      },
      persistedQuality: {
        should_index: false,
        noindex_reasons: ['missing_required_sections'],
        section_status: {
          verdict: 'procedural',
        },
      },
    });

    expect(result.gateShouldIndex).toBe(false);
    expect(result.gateReasons).toEqual(['missing_required_sections']);
    expect(result.hasProceduralGuidance).toBe(false);
    expect(result.isDraftPage).toBe(false);
    expect(result.safeDraftDescription).toContain('Acme is currently in editorial verification');
  });
});
