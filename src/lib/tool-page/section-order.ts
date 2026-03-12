export type ToolPageSectionKey =
  | 'verdict'
  | 'workflow_fit'
  | 'how_we_evaluated'
  | 'pricing'
  | 'getting_started'
  | 'strengths'
  | 'features'
  | 'specs'
  | 'platform'
  | 'faq'
  | 'alternatives'
  | 'sources'
  | 'update_history'
  | 'disclosures';

export interface ToolPageSectionLink {
  href: string;
  label: string;
}

const TOOL_PAGE_SECTION_LINKS: Record<ToolPageSectionKey, ToolPageSectionLink> = {
  verdict: { href: '#verdict', label: 'Verdict' },
  workflow_fit: { href: '#workflow-fit', label: 'Rollout checkpoints' },
  how_we_evaluated: { href: '#how-we-evaluate', label: 'How we evaluated' },
  pricing: { href: '#pricing-plans', label: 'Pricing' },
  getting_started: { href: '#getting-started', label: 'Getting started' },
  strengths: { href: '#strengths', label: 'Strengths' },
  features: { href: '#features', label: 'Features' },
  specs: { href: '#specs', label: 'Specs' },
  platform: { href: '#platform-integrations', label: 'Platforms' },
  faq: { href: '#faq', label: 'FAQ' },
  alternatives: { href: '#alternatives', label: 'Alternatives' },
  sources: { href: '#sources', label: 'Evidence details' },
  update_history: { href: '#update-history', label: 'Updates' },
  disclosures: { href: '/disclosure', label: 'Disclosures' },
};

const TOOL_PAGE_FIXED_SECTION_ORDER: ToolPageSectionKey[] = [
  'verdict',
  'workflow_fit',
  'how_we_evaluated',
  'pricing',
  'getting_started',
  'strengths',
  'features',
  'specs',
  'platform',
  'faq',
  'alternatives',
  'sources',
  'update_history',
  'disclosures',
];

export function buildToolPageFixedSectionLinks(
  visibleSections: Set<ToolPageSectionKey>
): ToolPageSectionLink[] {
  return TOOL_PAGE_FIXED_SECTION_ORDER.filter((section) => visibleSections.has(section)).map(
    (section) => TOOL_PAGE_SECTION_LINKS[section]
  );
}
