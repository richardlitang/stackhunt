import { describe, expect, it } from 'vitest';
import {
  buildToolPageCtaMediaStateInputFromTool,
  buildToolPageCtaMediaStateInputFromRouteContext,
  buildToolPageCtaMediaToolFromRouteTool,
} from '@/lib/tool-page/cta-media-input';

describe('tool page cta media input', () => {
  it('maps route-level tool and knowledge card data into cta media input', () => {
    const result = buildToolPageCtaMediaStateInputFromTool({
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

    expect(result.tool.slug).toBe('acme');
    expect(result.tool.category).toEqual({
      slug: 'project-management',
      name: 'Project Management',
    });
    expect(result.knowledgeCardPricing).toEqual({
      startingPrice: 19,
      model: 'subscription',
      plans: [{ name: 'Pro' }],
    });
    expect(result.renderVerdictSafe).toBe('Solid shortlist option');
  });

  it('handles missing knowledge card pricing data', () => {
    const result = buildToolPageCtaMediaStateInputFromTool({
      tool: {
        id: 'tool_2',
        slug: 'beta',
        name: 'Beta',
        logo_url: null,
        pricing_type: null,
        user_verifications_this_week: 0,
        video_id: null,
        video_title: null,
        category: null,
      },
      knowledgeCard: null,
      renderVerdictSafe: null,
    });

    expect(result.knowledgeCardPricing).toEqual({
      startingPrice: null,
      model: null,
      plans: undefined,
    });
    expect(result.tool.category).toBeNull();
  });

  it('builds cta media tool projection from route tool', () => {
    const result = buildToolPageCtaMediaToolFromRouteTool(
      {
        id: 'tool_3',
        slug: 'gamma',
        name: 'Gamma',
        logo_url: null,
        pricing_type: 'subscription',
        user_verifications_this_week: 3,
        video_id: 'vid_9',
        video_title: 'Gamma walkthrough',
      },
      { slug: 'analytics', name: 'Analytics' }
    );

    expect(result.slug).toBe('gamma');
    expect(result.category).toEqual({ slug: 'analytics', name: 'Analytics' });
  });

  it('builds cta media input from flattened route context', () => {
    const result = buildToolPageCtaMediaStateInputFromRouteContext({
      tool: {
        id: 'tool_3',
        slug: 'gamma',
        name: 'Gamma',
        logo_url: null,
        pricing_type: 'subscription',
        user_verifications_this_week: 3,
        video_id: 'vid_9',
        video_title: 'Gamma walkthrough',
      },
      category: { slug: 'analytics', name: 'Analytics' },
      knowledgeCard: {
        pricing: { starting_price: 49 },
        smp_pricing: { model: 'subscription', plans: [{ name: 'Team' }] },
      },
      renderVerdictSafe: 'Strong option',
    });

    expect(result.tool.slug).toBe('gamma');
    expect(result.tool.category).toEqual({ slug: 'analytics', name: 'Analytics' });
    expect(result.knowledgeCardPricing.startingPrice).toBe(49);
    expect(result.renderVerdictSafe).toBe('Strong option');
  });
});
