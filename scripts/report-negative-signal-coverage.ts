#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

type ReviewRow = {
  id: string;
  item_id: string;
  status: string;
  updated_at: string;
  cons: unknown;
  item: {
    id: string;
    slug: string;
    name: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

type ClaimLike = { text?: string };

const PRICING_BIAS_RE = /\b(pric|cost|billing|plan|tier|seat|trial|free tier|retention|subscription|fee|annual|monthly|tco)\b/i;

const DERIVED_PATTERN_BY_SIGNAL: Record<string, RegExp[]> = {
  constraints: [/^Usage limits apply:/i, /^Additional cost trigger:/i],
  pricing: [
    /^Minimum seat requirement:/i,
    /^Implementation fee required/i,
    /^Annual billing only$/i,
    /^Pricing requires contacting sales$/i,
    /^No self-serve free tier/i,
    /^No self-serve free trial/i,
  ],
  setup: [
    /^Setup may require developer involvement\./i,
    /^Setup requires IT\/admin privileges\./i,
    /^Implementation partner support may be required/i,
    /^Initial setup typically takes/i,
    /^Internal approval steps are required/i,
  ],
  portability: [
    /^No first-party data export path is documented\./i,
    /^Migration-out difficulty is listed as/i,
    /^Cancellation requires \d+-day notice\./i,
  ],
  integrations: [
    /^No public API access is documented in first-party sources\./i,
    /^Webhook support is not documented in first-party sources\./i,
    /^No public API or webhook support is documented\./i,
  ],
  security: [/^SSO is not listed as available for this product\./i],
  support: [/^Real-time support channels are limited/i],
};

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function toClaims(raw: unknown): ClaimLike[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return { text: entry };
      if (entry && typeof entry === 'object') return entry as ClaimLike;
      return null;
    })
    .filter((entry): entry is ClaimLike => Boolean(entry));
}

function textOf(claim: ClaimLike): string {
  return typeof claim.text === 'string' ? claim.text.trim() : '';
}

function detectDerivedSignals(cons: ClaimLike[]): Set<string> {
  const detected = new Set<string>();
  for (const claim of cons) {
    const text = textOf(claim);
    if (!text) continue;
    for (const [signal, patterns] of Object.entries(DERIVED_PATTERN_BY_SIGNAL)) {
      if (patterns.some((pattern) => pattern.test(text))) {
        detected.add(signal);
      }
    }
  }
  return detected;
}

function isPricingBiasedConText(text: string): boolean {
  return PRICING_BIAS_RE.test(text);
}

function getEligibleSignals(metadata: Record<string, unknown> | null): Set<string> {
  const eligible = new Set<string>();
  const setup = (metadata?.setup_complexity as Record<string, unknown> | undefined) || {};
  const redTape = (setup.red_tape as Record<string, unknown> | undefined) || {};
  const portability = (metadata?.smp_portability as Record<string, unknown> | undefined) || {};
  const integrations = (metadata?.integrations as Record<string, unknown> | undefined) || {};
  const security = (metadata?.security as Record<string, unknown> | undefined) || {};
  const support = (metadata?.support as Record<string, unknown> | undefined) || {};
  const constraints = (metadata?.constraints as Record<string, unknown> | undefined) || {};
  const hardLimits = Array.isArray(constraints.hard_limits) ? constraints.hard_limits : [];
  const hiddenCosts = Array.isArray(constraints.hidden_costs) ? constraints.hidden_costs : [];
  const pricing = (metadata?.smp_pricing as Record<string, unknown> | undefined) || {};
  const billingCycles = Array.isArray(pricing.billing_cycles) ? pricing.billing_cycles : [];

  if (
    setup.requires_developer === true ||
    setup.requires_it_admin === true ||
    setup.implementation_partner_needed === true ||
    setup.estimated_setup_time === 'days' ||
    setup.estimated_setup_time === 'weeks' ||
    redTape.admin_required === true ||
    redTape.approval_required === true
  ) {
    eligible.add('setup');
  }

  if (
    portability.has_data_export === false ||
    portability.migration_difficulty === 'hard' ||
    portability.migration_difficulty === 'locked' ||
    (typeof portability.cancellation_notice_days === 'number' &&
      Number.isFinite(portability.cancellation_notice_days) &&
      portability.cancellation_notice_days > 0)
  ) {
    eligible.add('portability');
  }

  if (integrations.has_api === false || integrations.has_webhooks === false) {
    eligible.add('integrations');
  }

  if (security.sso_available === false) {
    eligible.add('security');
  }

  if (
    support.has_live_chat === false &&
    support.has_phone_support === false &&
    support.has_dedicated_support === false
  ) {
    eligible.add('support');
  }

  if (hardLimits.length > 0 || hiddenCosts.length > 0) {
    eligible.add('constraints');
  }

  if (
    (typeof pricing.min_seats === 'number' && Number.isFinite(pricing.min_seats) && pricing.min_seats > 1) ||
    (typeof pricing.implementation_fee === 'number' &&
      Number.isFinite(pricing.implementation_fee) &&
      pricing.implementation_fee > 0) ||
    (billingCycles.length === 1 && billingCycles[0] === 'annual') ||
    pricing.model === 'contact_sales' ||
    (metadata?.pricing as Record<string, unknown> | undefined)?.has_free_tier === false ||
    (metadata?.pricing as Record<string, unknown> | undefined)?.has_free_trial === false
  ) {
    eligible.add('pricing');
  }

  return eligible;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const limitArg = Number(getArgValue('limit') || 200);
  const limit = Number.isFinite(limitArg) ? Math.max(10, Math.min(limitArg, 600)) : 200;

  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      item_id,
      status,
      updated_at,
      cons,
      item:items(
        id,
        slug,
        name,
        metadata
      )
    `
    )
    .is('context_id', null)
    .not('item_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Query failed: ${error.message}`);
    process.exit(1);
  }

  const rows = (data || []) as ReviewRow[];
  const latestByItem = new Map<string, ReviewRow>();
  for (const row of rows) {
    if (!row.item_id || !row.item) continue;
    if (!latestByItem.has(row.item_id)) latestByItem.set(row.item_id, row);
  }
  const latestRows = Array.from(latestByItem.values());

  const eligibleCounts = new Map<string, number>();
  const generatedCounts = new Map<string, number>();
  const unmetCounts = new Map<string, number>();
  let zeroConsCount = 0;
  let totalCons = 0;
  let pricingBiasedCons = 0;
  let nonPricingCons = 0;
  let reviewsAllPricingCons = 0;
  let reviewsWithAnyNonPricingCons = 0;
  const gapSamples: Array<{
    slug: string;
    status: string;
    consCount: number;
    eligibleSignals: string[];
    generatedSignals: string[];
  }> = [];

  for (const row of latestRows) {
    const cons = toClaims(row.cons);
    const renderedCons = cons.map((claim) => textOf(claim)).filter((text) => text.length > 0);
    const consCount = renderedCons.length;
    if (consCount === 0) zeroConsCount += 1;
    const pricingCount = renderedCons.filter((text) => isPricingBiasedConText(text)).length;
    const nonPricingCount = Math.max(0, consCount - pricingCount);
    totalCons += consCount;
    pricingBiasedCons += pricingCount;
    nonPricingCons += nonPricingCount;
    if (consCount > 0 && pricingCount === consCount) {
      reviewsAllPricingCons += 1;
    }
    if (nonPricingCount > 0) {
      reviewsWithAnyNonPricingCons += 1;
    }

    const eligibleSignals = getEligibleSignals(row.item?.metadata || null);
    const generatedSignals = detectDerivedSignals(cons);

    for (const signal of eligibleSignals) {
      eligibleCounts.set(signal, (eligibleCounts.get(signal) || 0) + 1);
      if (generatedSignals.has(signal)) {
        generatedCounts.set(signal, (generatedCounts.get(signal) || 0) + 1);
      } else {
        unmetCounts.set(signal, (unmetCounts.get(signal) || 0) + 1);
      }
    }

    const nonPricingEligible = Array.from(eligibleSignals).filter(
      (signal) => signal !== 'pricing' && signal !== 'constraints'
    );
    const nonPricingGenerated = Array.from(generatedSignals).filter(
      (signal) => signal !== 'pricing' && signal !== 'constraints'
    );
    if (nonPricingEligible.length > 0 && nonPricingGenerated.length === 0 && consCount <= 1) {
      if (gapSamples.length < 20) {
        gapSamples.push({
          slug: row.item?.slug || row.item_id,
          status: row.status,
          consCount,
          eligibleSignals: nonPricingEligible.sort(),
          generatedSignals: nonPricingGenerated.sort(),
        });
      }
    }
  }

  const signalKeys = Array.from(
    new Set([
      ...Object.keys(DERIVED_PATTERN_BY_SIGNAL),
      ...Array.from(eligibleCounts.keys()),
      ...Array.from(generatedCounts.keys()),
    ])
  ).sort();

  console.log('\nNegative Signal Coverage Report');
  console.log('='.repeat(88));
  console.log(`Reviews fetched: ${rows.length}`);
  console.log(`Latest discovery reviews analyzed: ${latestRows.length}`);
  console.log(`Latest reviews with 0 cons: ${zeroConsCount}`);
  const pricingPct = totalCons === 0 ? '0.0%' : `${((pricingBiasedCons / totalCons) * 100).toFixed(1)}%`;
  console.log(
    `Cons mix: total=${totalCons}, pricing_biased=${pricingBiasedCons} (${pricingPct}), non_pricing=${nonPricingCons}`
  );
  console.log(
    `Review mix: all_pricing_cons=${reviewsAllPricingCons}, with_any_non_pricing=${reviewsWithAnyNonPricingCons}`
  );

  console.log('\nSignal Coverage');
  console.log('-'.repeat(88));
  for (const signal of signalKeys) {
    const eligible = eligibleCounts.get(signal) || 0;
    const generated = generatedCounts.get(signal) || 0;
    const unmet = unmetCounts.get(signal) || 0;
    const pct = eligible === 0 ? 'n/a' : `${((generated / eligible) * 100).toFixed(1)}%`;
    console.log(
      `${signal.padEnd(13)} eligible=${String(eligible).padStart(3)} generated=${String(generated).padStart(3)} unmet=${String(unmet).padStart(3)} coverage=${pct}`
    );
  }

  console.log('\nGap Samples (eligible non-pricing signals, weak/no surviving cons)');
  console.log('-'.repeat(88));
  if (gapSamples.length === 0) {
    console.log('None');
  } else {
    for (const sample of gapSamples) {
      console.log(
        `${sample.slug} | status=${sample.status} | cons=${sample.consCount} | eligible=${sample.eligibleSignals.join(', ')} | generated=${sample.generatedSignals.join(', ') || 'none'}`
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
