import { describe, expect, it } from 'vitest';
import {
  buildToolPagePricingViewModel,
  deriveToolPagePricingSignals,
  type BuildToolPagePricingViewModelInput,
} from '@/lib/tool-page/pricing';

describe('tool page pricing', () => {
  it('detects pricing availability and free-plan signal from plans', () => {
    const result = deriveToolPagePricingSignals({
      toolPricingType: 'paid',
      pricingStartingPrice: '$19',
      smpPlans: [
        { name: 'Starter', price_monthly: 0 },
        { name: 'Pro', price_monthly: 29 },
      ],
      legacyPricingTiers: [],
      pricingSectionStatus: 'show',
    });

    expect(result.hasPricing).toBe(true);
    expect(result.hasFreePlanSignal).toBe(true);
  });

  it('does not expose pricing when pricing section is hidden', () => {
    const result = deriveToolPagePricingSignals({
      toolPricingType: 'freemium',
      pricingStartingPrice: 'Free',
      smpPlans: [{ name: 'Starter', price_monthly: 0 }],
      legacyPricingTiers: [{ name: 'Legacy' }],
      pricingSectionStatus: 'hide',
    });

    expect(result.hasPricing).toBe(false);
    expect(result.hasFreePlanSignal).toBe(true);
  });

  it('builds pricing evidence, checked label, and narrative for complete pricing state', () => {
    const input: BuildToolPagePricingViewModelInput = {
      hasPricing: true,
      pricingVerifiedLabel: 'Mar 4, 2026',
      officialEvidenceLinks: [
        { basis: 'Official docs/help center', url: 'https://acme.com/docs' },
        { basis: 'Official pricing pages', url: 'https://acme.com/pricing?ref=ad#tier' },
      ],
      directPricingPageSource: null,
      hardLimitFromConstraints: [
        { text: 'Plan cap: 100 seats', sourceUrl: 'https://acme.com/pricing' },
      ],
      effectiveEvidenceCons: [
        { text: 'Annual contract required above 50 seats', sourceUrl: 'https://acme.com/pricing' },
      ],
      hiddenCostBullets: [],
      canonicalHardLimitsCount: 1,
      sectionPricingStatus: 'show',
      budgetCostDrivers: ['Seat count growth'],
      budgetOneTimeFees: [],
      budgetCommitmentTerms: null,
      budgetRoiThreshold: 'Break-even at 5 seats',
    };

    const result = buildToolPagePricingViewModel(input);

    expect(result.officialPricingSource?.url).toBe('https://acme.com/pricing?ref=ad#tier');
    expect(result.pricingSourceUrl).toBe('https://acme.com/pricing');
    expect(result.hasPricingCheckedProof).toBe(true);
    expect(result.pricingCheckedLabel).toBe('Mar 4, 2026');
    expect(result.showPricingSection).toBe(true);
    expect(result.pricingNarrativeLead).toContain(
      'free or entry tier is enough now, what forces a Plus or Enterprise move'
    );
  });

  it('falls back to first pricing signal when structured pricing is incomplete', () => {
    const result = buildToolPagePricingViewModel({
      hasPricing: false,
      pricingVerifiedLabel: null,
      officialEvidenceLinks: [],
      directPricingPageSource: 'https://acme.com/plans',
      hardLimitFromConstraints: [],
      effectiveEvidenceCons: [
        { text: 'Enterprise tier starts at $99 per month', sourceUrl: 'https://acme.com/plans' },
      ],
      hiddenCostBullets: [],
      canonicalHardLimitsCount: 0,
      sectionPricingStatus: 'show',
      budgetCostDrivers: [],
      budgetOneTimeFees: [],
      budgetCommitmentTerms: null,
      budgetRoiThreshold: null,
    });

    expect(result.pricingSourceUrl).toBe('https://acme.com/plans');
    expect(result.pricingCheckedLabel).toBeNull();
    expect(result.pricingNarrativeLead).toBe('Enterprise tier starts at $99 per month.');
    expect(result.showPricingSection).toBe(true);
  });
});
