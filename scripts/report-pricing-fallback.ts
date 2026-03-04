#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type PricingStatus = 'show' | 'hide' | 'procedural' | 'unknown';

interface ItemRow {
  id: string;
  slug: string;
  name: string;
  metadata: Record<string, any> | null;
  specs: Record<string, any> | null;
  pricing_confidence: string | null;
  pricing_verified_at: string | null;
}

const hasMeaningfulPricingPlanName = (name?: string): boolean => {
  if (!name || !name.trim()) return false;
  const normalized = name.trim().toLowerCase();
  if (/^plan\s+\d+$/i.test(normalized)) return false;
  if (/^product\s+\d+$/i.test(normalized)) return false;
  return true;
};

const hasRenderablePlanPrice = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const hasRenderablePricingPlan = (plan: unknown): boolean => {
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
};

const isHttpUrl = (value: unknown): boolean =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const getPricingStatus = (item: ItemRow): PricingStatus => {
  const status = item.specs?.canonical?.quality?.section_status?.pricing;
  if (status === 'show' || status === 'hide' || status === 'procedural') return status;
  return 'unknown';
};

async function fetchAllItems(): Promise<ItemRow[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: ItemRow[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('items')
      .select('id,slug,name,metadata,specs,pricing_confidence,pricing_verified_at')
      .order('slug', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch items (${from}-${to}): ${error.message}`);
    }

    if (!data || data.length === 0) break;

    rows.push(...(data as ItemRow[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function main() {
  const items = await fetchAllItems();

  let publishablePricing = 0;
  let pricingHidden = 0;
  let sectionShown = 0;
  let fallbackShown = 0;

  const fallbackByReason = new Map<string, number>();
  const sampleFallbacks: Array<{
    slug: string;
    name: string;
    reasons: string[];
    pricingStatus: PricingStatus;
    pricingConfidence: string | null;
    pricingVerifiedAt: string | null;
  }> = [];

  for (const item of items) {
    const metadata = item.metadata || {};
    const specs = item.specs || {};

    const smpPlans = Array.isArray(metadata?.smp_pricing?.plans) ? metadata.smp_pricing.plans : [];
    const hasRenderableSmpPlans = smpPlans.some((plan: unknown) => hasRenderablePricingPlan(plan));
    const hasLegacyTiers =
      Array.isArray(metadata?.pricing?.tiers) && metadata.pricing.tiers.length > 0;
    const pricingStatus = getPricingStatus(item);

    const hasPricing =
      (hasRenderableSmpPlans || hasLegacyTiers) && pricingStatus === 'show';
    const hasOfficialPricingSource = isHttpUrl(metadata?.smp_pricing?.pricing_page_url);

    const hardLimits = Array.isArray(specs?.constraints?.hard_limits)
      ? specs.constraints.hard_limits
      : [];
    const hiddenCosts = Array.isArray(specs?.constraints?.hidden_costs)
      ? specs.constraints.hidden_costs
      : [];
    const hasConstraintPricingEvidence = hardLimits.length > 0 || hiddenCosts.length > 0;

    const showPricingSection =
      pricingStatus !== 'hide' &&
      (hasPricing || hasOfficialPricingSource || hasConstraintPricingEvidence);
    const showsFallback = showPricingSection && !hasPricing;

    if (hasPricing) publishablePricing += 1;
    if (pricingStatus === 'hide') pricingHidden += 1;
    if (showPricingSection) sectionShown += 1;
    if (showsFallback) fallbackShown += 1;

    if (!showsFallback) continue;

    const reasons: string[] = [];
    if (pricingStatus !== 'show') reasons.push(`section_status_${pricingStatus}`);
    if (!hasRenderableSmpPlans && !hasLegacyTiers) reasons.push('no_renderable_structured_pricing');
    if (smpPlans.length > 0 && !hasRenderableSmpPlans) reasons.push('plans_present_but_unrenderable');
    if (!hasOfficialPricingSource) reasons.push('no_official_pricing_url');
    if (!hasConstraintPricingEvidence) reasons.push('no_constraints_evidence');
    if (reasons.length === 0) reasons.push('other');

    for (const reason of reasons) {
      fallbackByReason.set(reason, (fallbackByReason.get(reason) || 0) + 1);
    }

    if (sampleFallbacks.length < 20) {
      sampleFallbacks.push({
        slug: item.slug,
        name: item.name,
        reasons,
        pricingStatus,
        pricingConfidence: item.pricing_confidence,
        pricingVerifiedAt: item.pricing_verified_at,
      });
    }
  }

  const total = items.length;
  const pct = (n: number): string => (total === 0 ? '0.0%' : `${((n / total) * 100).toFixed(1)}%`);
  const sortedReasons = Array.from(fallbackByReason.entries()).sort((a, b) => b[1] - a[1]);

  console.log('\nPricing Fallback QA Report');
  console.log('='.repeat(80));
  console.log(`Total tools scanned: ${total}`);
  console.log(`Pricing section shown: ${sectionShown} (${pct(sectionShown)})`);
  console.log(`Structured pricing publishable: ${publishablePricing} (${pct(publishablePricing)})`);
  console.log(`Pricing section hidden: ${pricingHidden} (${pct(pricingHidden)})`);
  console.log(`Fallback shown ("Structured pricing is incomplete"): ${fallbackShown} (${pct(fallbackShown)})`);

  console.log('\nFallback Root Causes');
  console.log('-'.repeat(80));
  if (sortedReasons.length === 0) {
    console.log('No fallback pages detected.');
  } else {
    for (const [reason, count] of sortedReasons) {
      console.log(`${reason}: ${count}`);
    }
  }

  console.log('\nFallback Samples (up to 20)');
  console.log('-'.repeat(80));
  if (sampleFallbacks.length === 0) {
    console.log('None');
  } else {
    for (const sample of sampleFallbacks) {
      console.log(
        `${sample.slug} | status=${sample.pricingStatus} | confidence=${sample.pricingConfidence || 'unknown'} | verified=${sample.pricingVerifiedAt || 'unknown'} | reasons=${sample.reasons.join(', ')}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
