export interface ToolPagePricingBullet {
  text: string;
  sourceUrl: string;
}

export interface ToolPagePricingEvidenceLink {
  url: string;
  basis: string;
}

export interface DeriveToolPagePricingSignalsInput {
  toolPricingType: string | null | undefined;
  pricingStartingPrice: string | null | undefined;
  smpPlans: unknown;
  legacyPricingTiers: unknown;
  pricingSectionStatus: 'show' | 'hide' | 'procedural' | string;
}

export interface ToolPagePricingSignals {
  hasPricing: boolean;
  hasFreePlanSignal: boolean;
}

export interface BuildToolPagePricingViewModelInput {
  hasPricing: boolean;
  pricingVerifiedLabel: string | null;
  officialEvidenceLinks: ToolPagePricingEvidenceLink[];
  directPricingPageSource: string | null;
  hardLimitFromConstraints: ToolPagePricingBullet[];
  effectiveEvidenceCons: ToolPagePricingBullet[];
  hiddenCostBullets: ToolPagePricingBullet[];
  canonicalHardLimitsCount: number;
  sectionPricingStatus: 'show' | 'hide' | 'procedural' | string;
  budgetCostDrivers: string[];
  budgetOneTimeFees: string[];
  budgetCommitmentTerms: string | null | undefined;
  budgetRoiThreshold: string | null | undefined;
}

export interface ToolPagePricingViewModel {
  officialPricingSource: ToolPagePricingEvidenceLink | null;
  pricingSourceUrl: string | null;
  pricingSnapshotBullets: ToolPagePricingBullet[];
  pricingEvidenceLinks: ToolPagePricingBullet[];
  hasPricingCheckedProof: boolean;
  pricingCheckedLabel: string | null;
  showPricingSection: boolean;
  pricingNarrativeLead: string;
  pricingNarrativeLabel: string;
}

const PRICING_SUBJECTIVE_ROI_PATTERN =
  /\b(justified|productivity|best value|worth it|excellent|great)\b/i;
const PRICING_OBJECTIVE_ROI_PATTERN =
  /\b(\d+|team|seat|user|plan|tier|enterprise|business|sso|api|compliance|usage|volume|monthly|annual)\b/i;

function hasMeaningfulPricingPlanName(name?: string): boolean {
  if (!name || !name.trim()) return false;
  const normalized = name.trim().toLowerCase();
  if (/^plan\s+\d+$/i.test(normalized)) return false;
  if (/^product\s+\d+$/i.test(normalized)) return false;
  return true;
}

function hasRenderablePlanPrice(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function hasRenderablePricingPlan(plan: unknown): boolean {
  if (!plan || typeof plan !== 'object') return false;
  const planRecord = plan as Record<string, unknown>;
  const planName = typeof planRecord.name === 'string' ? planRecord.name : '';
  const hasNamedTier = planName.trim().length > 0;
  const hasPriceSignal =
    hasRenderablePlanPrice(planRecord.price_monthly) ||
    hasRenderablePlanPrice(planRecord.price_annual) ||
    hasRenderablePlanPrice(planRecord.price_per_unit);
  const isEnterprise = planRecord.is_enterprise === true;
  return (
    hasMeaningfulPricingPlanName(planName) || (hasNamedTier && (hasPriceSignal || isEnterprise))
  );
}

function normalizeNarrativeSentence(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[.]+$/, '').trim();
}

function sanitizeRoiThresholdForPricingLead(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = normalizeNarrativeSentence(value);
  if (!normalized) return '';
  if (!PRICING_OBJECTIVE_ROI_PATTERN.test(normalized)) return '';
  if (PRICING_SUBJECTIVE_ROI_PATTERN.test(normalized)) return '';
  return normalized;
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

function withUniqueText(items: ToolPagePricingBullet[]): ToolPagePricingBullet[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function deriveToolPagePricingSignals(
  input: DeriveToolPagePricingSignalsInput
): ToolPagePricingSignals {
  const plans = Array.isArray(input.smpPlans) ? input.smpPlans : [];
  const hasRenderableSmpPlans = plans.some((plan) => hasRenderablePricingPlan(plan));
  const legacyTierCount = Array.isArray(input.legacyPricingTiers)
    ? input.legacyPricingTiers.length
    : 0;

  const hasPricing = Boolean(
    (hasRenderableSmpPlans || legacyTierCount > 0) && input.pricingSectionStatus === 'show'
  );

  const hasFreePlanSignal = Boolean(
    String(input.toolPricingType || '').toLowerCase() === 'freemium' ||
    (typeof input.pricingStartingPrice === 'string' &&
      /\bfree\b/i.test(input.pricingStartingPrice)) ||
    plans.some((plan) => {
      if (!plan || typeof plan !== 'object') return false;
      const record = plan as Record<string, unknown>;
      const monthly = typeof record.price_monthly === 'number' ? record.price_monthly : null;
      const annual = typeof record.price_annual === 'number' ? record.price_annual : null;
      const name = typeof record.name === 'string' ? record.name : '';
      return monthly === 0 || annual === 0 || /\bfree\b/i.test(name);
    })
  );

  return {
    hasPricing,
    hasFreePlanSignal,
  };
}

export function buildToolPagePricingViewModel(
  input: BuildToolPagePricingViewModelInput
): ToolPagePricingViewModel {
  const officialPricingSource =
    input.officialEvidenceLinks.find((entry) => entry.basis === 'Official pricing pages') || null;

  const pricingSourceUrl =
    normalizeSourceUrl(officialPricingSource?.url) ||
    normalizeSourceUrl(input.directPricingPageSource);

  const pricingSnapshotBullets = withUniqueText(
    [
      ...input.hardLimitFromConstraints,
      ...input.effectiveEvidenceCons,
      ...input.hiddenCostBullets,
    ].filter((item) =>
      /\$|\/\s*(mo|month|yr|year)|\b(price|pricing|plan|tier|seat|monthly|annual|enterprise|max)\b/i.test(
        item.text
      )
    )
  ).slice(0, 5);

  const pricingEvidenceLinks = withUniqueText(
    pricingSnapshotBullets.filter((item) => Boolean(item.sourceUrl))
  ).slice(0, 3);

  const hasPricingCheckedProof = Boolean(input.pricingVerifiedLabel && pricingSourceUrl);
  const pricingCheckedLabel = hasPricingCheckedProof ? input.pricingVerifiedLabel : null;

  const showPricingSection = Boolean(
    input.sectionPricingStatus !== 'hide' &&
    (input.hasPricing ||
      officialPricingSource ||
      pricingEvidenceLinks.length > 0 ||
      input.canonicalHardLimitsCount > 0)
  );

  const budgetMechanicsSignals = [
    ...input.budgetCostDrivers,
    ...input.budgetOneTimeFees,
    typeof input.budgetCommitmentTerms === 'string' ? input.budgetCommitmentTerms : '',
    sanitizeRoiThresholdForPricingLead(input.budgetRoiThreshold),
  ]
    .map(normalizeNarrativeSentence)
    .filter((item) => item.length > 0);

  const hasBudgetMechanicsSignal = budgetMechanicsSignals.length > 0;

  const pricingNarrativeLead = (() => {
    if (input.hasPricing) {
      if (hasBudgetMechanicsSignal) {
        return 'Pricing depends on plan, seats, and usage. Use this section to evaluate budget drivers, contract terms, and published plan pricing together.';
      }
      return 'Pricing scales with plan and usage, so model your real team shape before committing.';
    }

    if (pricingSnapshotBullets.length > 0) {
      const firstPricingSignal = normalizeNarrativeSentence(pricingSnapshotBullets[0].text);
      if (firstPricingSignal.length > 0) {
        return `${firstPricingSignal}.`;
      }
    }

    return 'Published pricing details are still incomplete; verify budget assumptions on the official pricing page.';
  })();

  return {
    officialPricingSource,
    pricingSourceUrl,
    pricingSnapshotBullets,
    pricingEvidenceLinks,
    hasPricingCheckedProof,
    pricingCheckedLabel,
    showPricingSection,
    pricingNarrativeLead,
    pricingNarrativeLabel:
      'Use this block to separate plan facts from the first upgrade or cost-risk trigger.',
  };
}
