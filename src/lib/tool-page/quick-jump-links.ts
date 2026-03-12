import {
  buildToolPageFixedSectionLinks,
  type ToolPageSectionKey,
} from '@/lib/tool-page/section-order';

interface BuildToolPageQuickJumpLinksInput {
  showVerdict: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
  hasStrengths: boolean;
  hasFeatures: boolean;
  showSpecs: boolean;
  hasPlatform: boolean;
  hasFaq: boolean;
  hasAlternatives: boolean;
  hasSources: boolean;
  hasUpdates: boolean;
}

export interface ToolPageQuickJumpLink {
  href: string;
  label: string;
}

export function buildToolPageQuickJumpLinks(
  input: BuildToolPageQuickJumpLinksInput
): ToolPageQuickJumpLink[] {
  const visibleSections = new Set<ToolPageSectionKey>([
    'workflow_fit',
    'how_we_evaluated',
    'disclosures',
  ]);
  if (input.showVerdict) visibleSections.add('verdict');
  if (input.showPricingSection) visibleSections.add('pricing');
  if (input.hasGettingStarted) visibleSections.add('getting_started');
  if (input.hasStrengths) visibleSections.add('strengths');
  if (input.hasFeatures) visibleSections.add('features');
  if (input.showSpecs) visibleSections.add('specs');
  if (input.hasPlatform) visibleSections.add('platform');
  if (input.hasFaq) visibleSections.add('faq');
  if (input.hasAlternatives) visibleSections.add('alternatives');
  if (input.hasSources) visibleSections.add('sources');
  if (input.hasUpdates) visibleSections.add('update_history');
  return buildToolPageFixedSectionLinks(visibleSections);
}
