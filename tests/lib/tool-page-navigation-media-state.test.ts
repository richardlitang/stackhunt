import { describe, expect, it } from 'vitest';
import { buildToolPageCtaMediaStateInputFromRouteContext } from '@/lib/tool-page/cta-media-input';
import { buildToolPageCtaMediaState } from '@/lib/tool-page/cta-media-state';
import { buildToolPageNavigationMediaStateFromRouteContext } from '@/lib/tool-page/navigation-media-state';
import { buildToolPageNavigationStateInputFromRouteContext } from '@/lib/tool-page/navigation-input';
import { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';

describe('tool page navigation/media composite state', () => {
  it('composes navigation and media states from route context', () => {
    const navigation = {
      hasVerdict: true,
      showProceduralVerdict: false,
      hasGettingStarted: true,
      showPricingSection: true,
      hasStrengths: true,
      hasFeatures: true,
      hasSpecs: true,
      showProceduralSpecs: false,
      hasPlatform: true,
      hasFAQ: true,
      hasAlternatives: true,
      faqItems: [{ question: 'Q1', answer: 'A1' }],
      evidenceBasis: [{ label: 'docs_checked', count: 1 }],
      lowConfidenceEvidenceLinks: [{ url: 'https://example.com' }],
      updateHistoryEntries: [{ label: 'Updated review date' }],
    };
    const media = {
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        logo_url: 'https://example.com/logo.png',
        pricing_type: 'subscription',
        user_verifications_this_week: 2,
        video_id: 'vid_1',
        video_title: 'Acme demo',
      },
      category: { slug: 'project-management', name: 'Project Management' },
      knowledgeCard: {
        pricing: { starting_price: 29 },
        smp_pricing: { model: 'subscription', plans: [{ name: 'Pro' }] },
      },
      renderVerdictSafe: 'Solid fit',
    };

    const result = buildToolPageNavigationMediaStateFromRouteContext({ navigation, media });

    const expectedNavigation = buildToolPageNavigationState(
      buildToolPageNavigationStateInputFromRouteContext(navigation)
    );
    const expectedMedia = buildToolPageCtaMediaState(
      buildToolPageCtaMediaStateInputFromRouteContext(media)
    );

    expect(result.navigationState).toEqual(expectedNavigation);
    expect(result.ctaMediaState).toEqual(expectedMedia);
  });
});
