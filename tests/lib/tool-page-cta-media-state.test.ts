import { describe, expect, it } from 'vitest';
import {
  buildToolPageCtaMediaState,
  buildToolPageCtaMediaStateFromRoute,
} from '@/lib/tool-page/cta-media-state';

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
    const state = buildToolPageCtaMediaStateFromRoute({
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
    });

    expect(state.addToStackProps.toolSlug).toBe('acme');
    expect(state.verdictContent.body).toContain('Solid shortlist option');
  });
});
