export interface ToolPageIndexPolicyInput {
  gateShouldIndex: boolean;
  isDraftPage: boolean;
  pendingVerificationCount: number;
  toolPageQaPass: boolean;
  showReviewInProgressBanner: boolean;
  toolCanonicalUrl?: string;
  fallbackCanonicalUrl?: string;
  defaultDescription?: string;
  draftDescription?: string;
}

export interface ToolPageIndexPolicyResult {
  shouldNoindex: boolean;
  blockingReasons: string[];
  reasons: string[];
  overrideApplied: boolean;
  robotsTag: 'noindex,follow' | 'index,follow';
  canonicalUrl: string;
  description: string;
}

/**
 * Centralizes index/noindex precedence for tool pages.
 * Review-in-progress mode can intentionally override blockers to allow indexing.
 */
export function evaluateToolPageIndexPolicy(
  input: ToolPageIndexPolicyInput
): ToolPageIndexPolicyResult {
  const blockingReasons: string[] = [];

  if (!input.gateShouldIndex) {
    blockingReasons.push('gate_should_not_index');
  }
  if (input.isDraftPage) {
    blockingReasons.push('draft_page');
  }
  if (input.pendingVerificationCount > 0) {
    blockingReasons.push('pending_verification');
  }
  if (!input.toolPageQaPass) {
    blockingReasons.push('tool_page_qa_failed');
  }

  const baseNoindex = blockingReasons.length > 0;
  const overrideApplied = input.showReviewInProgressBanner && baseNoindex;
  const shouldNoindex = overrideApplied ? false : baseNoindex;
  const canonicalUrl =
    shouldNoindex && input.fallbackCanonicalUrl
      ? input.fallbackCanonicalUrl
      : input.toolCanonicalUrl || input.fallbackCanonicalUrl || '';
  const description =
    shouldNoindex && !overrideApplied
      ? input.draftDescription || input.defaultDescription || ''
      : input.defaultDescription || input.draftDescription || '';

  return {
    shouldNoindex,
    blockingReasons,
    reasons: blockingReasons,
    overrideApplied,
    robotsTag: shouldNoindex ? 'noindex,follow' : 'index,follow',
    canonicalUrl,
    description,
  };
}
