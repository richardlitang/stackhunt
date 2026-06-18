import { describe, expect, it } from 'vitest';
import { buildToolPageCtaMediaState } from '@/lib/tool-page/presentation/cta-media-state';
import { buildToolPageCtaMediaStateInputFromTool } from '@/lib/tool-page/presentation/cta-media-input';

describe('tool page cta media state', () => {
  it('builds CTA/media state from normalized input', () => {
    const state = buildToolPageCtaMediaState({
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        logo_url: 'https://example.com/logo.png',
        pricing_type: 'freemium',
        user_verifications_this_week: 7,
        video_id: 'abc123',
        video_title: 'Acme demo',
        category: { slug: 'project-management', name: 'Project Management' },
      },
      knowledgeCardPricing: {
        startingPrice: 19,
        model: 'subscription',
        plans: [{ name: 'Pro' }],
      },
      renderVerdictSafe: 'Solid shortlist option',
    });

    expect(state.compareButtonProps.toolSlug).toBe('acme');
    expect(state.videoState.hasVideo).toBe(true);
  });

  it('builds CTA/media state from route-level input', () => {
    const state = buildToolPageCtaMediaState(
      buildToolPageCtaMediaStateInputFromTool({
        tool: {
          id: 'tool_1',
          slug: 'acme',
          name: 'Acme',
          logo_url: 'https://example.com/logo.png',
          pricing_type: 'freemium',
          user_verifications_this_week: 7,
          video_id: 'abc123',
          video_title: 'Acme demo',
          category: { slug: 'project-management', name: 'Project Management' },
        },
        knowledgeCard: {
          pricing: { starting_price: 19 },
          smp_pricing: {
            model: 'subscription',
            plans: [{ name: 'Pro' }],
          },
        },
        renderVerdictSafe: 'Solid shortlist option',
      })
    );

    expect(state.addToStackProps.toolSlug).toBe('acme');
    expect(state.verdictContent.body).toContain('Solid shortlist option');
  });

  it('filters add-to-stack plans for the active pricing lens', () => {
    const state = buildToolPageCtaMediaState({
      tool: {
        id: 'tool_4',
        slug: 'delta',
        name: 'Delta',
        logo_url: null,
        pricing_type: 'tiered',
        user_verifications_this_week: 0,
        video_id: null,
        video_title: null,
        category: null,
      },
      knowledgeCardPricing: {
        startingPrice: null,
        model: 'tiered',
        plans: [
          { name: 'Free', target_audience: 'individual' },
          { name: 'Team', target_audience: 'team' },
          { name: 'Enterprise', target_audience: 'enterprise' },
        ],
      },
      renderVerdictSafe: null,
      activeReviewLens: 'enterprise',
    });

    const plans = Array.isArray(state.addToStackProps.plans) ? state.addToStackProps.plans : [];
    expect(plans).toHaveLength(1);
    expect((plans[0] as { name?: string }).name).toBe('Enterprise');
  });
});
