import { describe, expect, it } from 'vitest';

import { buildToolPageWorkflowFitVisibility } from '@/lib/tool-page/workflow-fit-visibility';

describe('tool-page workflow fit visibility', () => {
  it('hides workflow fit section for CRM categories', () => {
    const result = buildToolPageWorkflowFitVisibility({
      categorySlug: 'crm-sales',
      hasWorkflowCards: true,
      hasWorkflowHighlights: true,
    });

    expect(result.showWorkflowFitSection).toBe(false);
  });

  it('shows workflow fit section for non-CRM categories with content', () => {
    const result = buildToolPageWorkflowFitVisibility({
      categorySlug: 'project-management',
      hasWorkflowCards: true,
      hasWorkflowHighlights: false,
    });

    expect(result.showWorkflowFitSection).toBe(true);
  });

  it('hides section when there is no workflow content', () => {
    const result = buildToolPageWorkflowFitVisibility({
      categorySlug: 'project-management',
      hasWorkflowCards: false,
      hasWorkflowHighlights: false,
    });

    expect(result.showWorkflowFitSection).toBe(false);
  });
});
