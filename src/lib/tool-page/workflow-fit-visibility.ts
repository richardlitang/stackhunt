interface BuildToolPageWorkflowFitVisibilityInput {
  categorySlug: string | null;
  hasWorkflowCards: boolean;
  hasWorkflowHighlights: boolean;
}

function isCrmCategorySlug(slug: string | null): boolean {
  const normalized = (slug || '').toLowerCase();
  return normalized.includes('crm');
}

export function buildToolPageWorkflowFitVisibility(
  input: BuildToolPageWorkflowFitVisibilityInput
): {
  showWorkflowFitSection: boolean;
} {
  const hasWorkflowContent = input.hasWorkflowCards || input.hasWorkflowHighlights;
  if (!hasWorkflowContent) return { showWorkflowFitSection: false };

  // CRM pages already show explicit rollout checklists and common setups.
  if (isCrmCategorySlug(input.categorySlug)) {
    return { showWorkflowFitSection: false };
  }

  return { showWorkflowFitSection: true };
}
