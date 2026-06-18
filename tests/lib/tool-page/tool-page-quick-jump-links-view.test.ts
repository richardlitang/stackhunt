import { describe, expect, it } from 'vitest';

import { buildToolPageQuickJumpLinksView } from '@/lib/tool-page/navigation/quick-jump-links-view';

describe('tool page quick jump links view', () => {
  const links = [
    { href: '#workflow-fit', label: 'Rollout checkpoints' },
    { href: '#pricing-plans', label: 'Pricing' },
  ];

  it('keeps workflow-fit link when section is visible', () => {
    const result = buildToolPageQuickJumpLinksView({
      links,
      showWorkflowFitSection: true,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.href).toBe('#workflow-fit');
  });

  it('removes workflow-fit link when section is hidden', () => {
    const result = buildToolPageQuickJumpLinksView({
      links,
      showWorkflowFitSection: false,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.href).toBe('#pricing-plans');
  });
});
