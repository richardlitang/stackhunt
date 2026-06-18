import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeLensContentInputFromRoute } from '@/lib/tool-page/route-state/runtime-lens-content-input';
import {
  buildToolPageRuntimeSchemasInputFromRoute,
  buildToolPageRuntimeUpdateHistoryInputFromRoute,
} from '@/lib/tool-page/route-state/runtime-schema-history-input';
import { buildToolPageRuntimeViewModelInputFromRoute } from '@/lib/tool-page/route-state/runtime-viewmodel-input';

describe('tool page runtime view inputs', () => {
  it('maps route booleans into runtime view-model input', () => {
    const result = buildToolPageRuntimeViewModelInputFromRoute({
      hasVerdict: true,
      showProceduralVerdict: false,
      showPricingSection: true,
      hasGettingStarted: true,
      hasFeatures: true,
      hasSpecs: false,
      showProceduralSpecs: true,
      hasPlatform: true,
      hasAlternatives: true,
    });

    expect(result.hasVerdict).toBe(true);
    expect(result.showProceduralSpecs).toBe(true);
    expect(result.hasSpecs).toBe(false);
  });

  it('maps lens content and schemas/history inputs', () => {
    const lens = buildToolPageRuntimeLensContentInputFromRoute({
      toolName: 'Acme',
      hasCollectedSources: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasSecurity: true,
      decisionSnapshotBestWhen: ['Best when speed matters'],
      decisionSnapshotWatchOuts: ['Watch migration costs'],
      decisionSnapshotDifferentiators: ['Fast onboarding'],
      decisionTradeoffSummary: 'Great for lean teams',
    });
    const schemas = buildToolPageRuntimeSchemasInputFromRoute({
      tool: { slug: 'acme', name: 'Acme' },
      primaryOffer: null,
      reviewCount: 3,
      faqSchema: null,
    });
    const history = buildToolPageRuntimeUpdateHistoryInputFromRoute({
      communityVerifiedLabel: '2026-03-03',
      specsVerifiedLabel: '2026-03-04',
      pricingCheckedLabel: '2026-03-05',
    });

    expect(lens.toolName).toBe('Acme');
    expect(lens.decisionSnapshotDifferentiators).toEqual(['Fast onboarding']);
    expect(schemas.reviewCount).toBe(3);
    expect(history.pricingCheckedLabel).toBe('2026-03-05');
  });
});
