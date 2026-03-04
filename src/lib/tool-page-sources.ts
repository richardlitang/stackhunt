export interface ToolPageSourceLike {
  url?: string | null;
}

export interface ToolPageSourceUrlLike {
  sourceUrl?: string | null;
}

export interface ToolPageFaqSourceLike {
  answer_source_url?: string | null;
}

export interface BuildToolPageSourcesViewModelInput {
  evidenceLinksAll: ToolPageSourceLike[];
  effectiveEvidencePros: ToolPageSourceUrlLike[];
  effectiveEvidenceCons: ToolPageSourceUrlLike[];
  pricingSourceUrl: string | null;
  pricingEvidenceLinks: ToolPageSourceUrlLike[];
  faqItems: ToolPageFaqSourceLike[];
  officialDocsSourceUrl: string | null;
  canonicalHardLimits: ToolPageSourceUrlLike[];
}

export interface ToolPageSourcesBySection {
  pros_cons: number;
  pricing: number;
  faq: number;
  specs: number;
}

export interface ToolPageSourcesViewModel {
  collectedSourcesBySection: ToolPageSourcesBySection;
  collectedSourcesTotal: number;
  hasCollectedSources: boolean;
}

function normalizeSourceUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildToolPageSourcesViewModel(
  input: BuildToolPageSourcesViewModelInput
): ToolPageSourcesViewModel {
  const prosConsSourceUrls = new Set(
    [...input.effectiveEvidencePros, ...input.effectiveEvidenceCons]
      .map((entry) => normalizeSourceUrl(entry.sourceUrl))
      .filter((entry): entry is string => Boolean(entry))
  );
  const pricingSourceUrls = new Set(
    [
      normalizeSourceUrl(input.pricingSourceUrl),
      ...input.pricingEvidenceLinks.map((entry) => normalizeSourceUrl(entry.sourceUrl)),
    ]
      .filter((entry): entry is string => Boolean(entry))
  );
  const faqSourceUrls = new Set(
    input.faqItems
      .map((item) => normalizeSourceUrl(item.answer_source_url))
      .filter((entry): entry is string => Boolean(entry))
  );
  const specsSourceUrls = new Set(
    [input.officialDocsSourceUrl, ...input.canonicalHardLimits.map((item) => item.sourceUrl)]
      .map((entry) => normalizeSourceUrl(entry))
      .filter((entry): entry is string => Boolean(entry))
  );
  const baselineSourceUrls = new Set(
    input.evidenceLinksAll
      .map((entry) => normalizeSourceUrl(entry.url))
      .filter((entry): entry is string => Boolean(entry))
  );
  const collectedSourceUrlSet = new Set<string>([
    ...baselineSourceUrls,
    ...prosConsSourceUrls,
    ...pricingSourceUrls,
    ...faqSourceUrls,
    ...specsSourceUrls,
  ]);

  const collectedSourcesBySection: ToolPageSourcesBySection = {
    pros_cons: prosConsSourceUrls.size,
    pricing: pricingSourceUrls.size,
    faq: faqSourceUrls.size,
    specs: specsSourceUrls.size,
  };
  const collectedSourcesTotal = collectedSourceUrlSet.size;

  return {
    collectedSourcesBySection,
    collectedSourcesTotal,
    hasCollectedSources: collectedSourcesTotal > 0,
  };
}
