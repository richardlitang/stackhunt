import { describe, expect, it } from 'vitest';
import { buildToolPageLensViewFields } from '@/lib/tool-page/presentation/lens-view-fields';

describe('tool page lens view fields', () => {
  it('projects lens runtime values into a route-friendly view object', () => {
    const result = buildToolPageLensViewFields({
      lensHrefs: { general: '#g', personal: '#p', startup: '#s', enterprise: '#e' },
      focusSwitchOptions: [{ id: 'all', label: 'All' }],
      lensDefaultFocus: 'all',
      showFocusSwitch: true,
      lensPriorityLinks: [{ href: '#verdict', label: 'Verdict' }],
      verdictLabelRationale: 'Rationale',
      reviewDek: 'Review dek',
      readerFocusNote: 'Focus note',
      lensBestFitLine: 'Best fit',
      lensWeakFitLine: 'Weak fit',
      lensTradeoffLine: 'Tradeoff',
      scoreDrivers: [{ label: 'Evidence', text: 'Strong docs' }],
      workflowFitHighlights: ['Highlights'],
      workflowFitCards: [{ title: 'Card', body: 'Body' }],
    } as any);

    expect(result.showFocusSwitch).toBe(true);
    expect(result.lensPriorityLinks[0].label).toBe('Verdict');
    expect(result.scoreDrivers[0].label).toBe('Evidence');
  });
});
