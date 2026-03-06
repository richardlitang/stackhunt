import type { ToolPageQuickJumpLink } from '@/lib/tool-page/quick-jump-links';

interface BuildToolPageQuickJumpLinksViewInput {
  links: ToolPageQuickJumpLink[];
  showWorkflowFitSection: boolean;
}

export function buildToolPageQuickJumpLinksView(
  input: BuildToolPageQuickJumpLinksViewInput
): ToolPageQuickJumpLink[] {
  return input.showWorkflowFitSection
    ? input.links
    : input.links.filter((link) => link.href !== '#workflow-fit');
}
