import { describe, expect, it } from 'vitest';
import { buildToolPageChromeStateInputFromRouteContext } from '@/lib/tool-page/chrome-input';
import { buildToolPageChromeLensStateFromRouteContext } from '@/lib/tool-page/chrome-lens-state';
import { buildToolPageLensViewFields } from '@/lib/tool-page/lens-view-fields';
import { buildToolPageChromeState } from '@/lib/tool-page/page-chrome-state';

describe('tool page chrome/lens composite state', () => {
  it('composes lens fields and chrome state from route context', () => {
    const lensRuntime = {
      activeReviewLens: 'general',
      lensLinks: {
        general: '/tool/acme',
        budget: '/tool/acme?lens=budget',
        alternatives: '/tool/acme?lens=alternatives',
      },
      lensLabelMap: {
        general: 'All-around fit',
        budget: 'Budget fit',
        alternatives: 'Compare alternatives',
      },
      focusSwitchOptions: [{ id: 'verdict', label: 'Verdict first' }],
      lensPriorityLinks: [{ href: '#verdict', label: 'Verdict' }],
      verdictLabelRationale: 'Best fit based on evidence.',
      reviewDek: 'Summary line',
      readerFocusNote: 'Control emphasis only.',
      lensBestFitLine: 'Great for small teams',
      lensWeakFitLine: 'Not ideal for enterprises',
      lensTradeoffLine: 'Lower flexibility',
      scoreDrivers: ['Evidence quality'],
      workflowFitHighlights: ['Fast setup'],
      workflowFitCards: [],
    } as const;

    const chrome = {
      toolCategory: { slug: 'project-management', name: 'Project Management' },
      hasCollectedSources: true,
      evaluationDepth: 'high',
      collectedSourcesTotal: 8,
      trustConfidenceLabel: 'High confidence',
      pendingVerificationCount: 1,
      communityVerifiedLabel: 'Community checked',
      specsVerifiedLabel: 'Specs checked',
      pricingCheckedLabel: 'Pricing checked',
      pricingVerifiedLabel: 'Pricing community-verified',
      trustStatus: 'reviewing',
      activeReviewLens: 'general',
      lensLabelMap: {
        general: 'All-around fit',
        budget: 'Budget fit',
        alternatives: 'Compare alternatives',
      },
      tool: {
        name: 'Acme',
        is_verified: true,
        last_reviewed_at: '2026-03-01T00:00:00.000Z',
        reviewed_at: '2026-02-20T00:00:00.000Z',
        updated_at: '2026-02-25T00:00:00.000Z',
        published_at: '2026-01-01T00:00:00.000Z',
      },
      websiteHostLabel: 'acme.com',
    } as const;

    const result = buildToolPageChromeLensStateFromRouteContext({ lensRuntime, chrome });

    const expectedLens = buildToolPageLensViewFields(lensRuntime);
    const expectedChrome = buildToolPageChromeState(
      buildToolPageChromeStateInputFromRouteContext(chrome)
    );

    expect(result.lensViewFields).toEqual(expectedLens);
    expect(result.toolChromeState).toEqual(expectedChrome);
  });
});
