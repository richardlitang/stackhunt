interface BuildToolPageQuickJumpLinksInput {
  showVerdict: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
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
  const links: ToolPageQuickJumpLink[] = [
    { href: '#workflow-fit', label: 'Rollout checkpoints' },
    { href: '#how-we-evaluate', label: 'How we evaluated' },
  ];

  if (input.showVerdict) links.unshift({ href: '#verdict', label: 'Verdict' });
  if (input.hasGettingStarted) links.push({ href: '#getting-started', label: 'Getting started' });
  if (input.showPricingSection) links.push({ href: '#pricing-plans', label: 'Pricing' });
  if (input.hasFeatures) links.push({ href: '#features', label: 'Features' });
  if (input.showSpecs) links.push({ href: '#specs', label: 'Specs' });
  if (input.hasPlatform) links.push({ href: '#platform-integrations', label: 'Platforms' });
  if (input.hasFaq) links.push({ href: '#faq', label: 'FAQ' });
  if (input.hasAlternatives) links.push({ href: '#alternatives', label: 'Alternatives' });
  if (input.hasSources) links.push({ href: '#sources', label: 'Sources' });
  if (input.hasUpdates) links.push({ href: '#update-history', label: 'Updates' });

  links.push({ href: '/disclosure', label: 'Disclosures' });
  return links;
}
