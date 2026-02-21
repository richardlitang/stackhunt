#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getAvailableSourceSlots, parseQueueCap } from './lib/queue-guardrails.js';

dotenv.config();

type PricingStatus = 'show' | 'hide' | 'procedural' | 'unknown';

interface ItemRow {
  id: string;
  slug: string;
  name: string;
  metadata: Record<string, any> | null;
  specs: Record<string, any> | null;
}

interface QueueRow {
  tool_name: string;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.split('=').slice(1).join('=').trim();
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

async function fetchAllItems(supabase: ReturnType<typeof createClient>): Promise<ItemRow[]> {
  const pageSize = 1000;
  let from = 0;
  const rows: ItemRow[] = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('items')
      .select('id,slug,name,metadata,specs')
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
  const apply = hasFlag('apply');
  const limitArg = Number(getArgValue('limit') || 100);
  const priorityMissingArg = Number(getArgValue('priority-missing-url') || 96);
  const priorityOtherArg = Number(getArgValue('priority-other') || 92);
  const huntType = (getArgValue('hunt-type') || 'full').toLowerCase();

  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 500)) : 100;
  const priorityMissing = Number.isFinite(priorityMissingArg)
    ? Math.max(0, Math.min(priorityMissingArg, 100))
    : 96;
  const priorityOther = Number.isFinite(priorityOtherArg)
    ? Math.max(0, Math.min(priorityOtherArg, 100))
    : 92;

  if (!['full', 'refresh', 'price_only'].includes(huntType)) {
    console.error(`Invalid --hunt-type=${huntType}. Use full, refresh, or price_only.`);
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const items = await fetchAllItems(supabase);

  const fallbackCandidates = items
    .map((item) => {
      const metadata = item.metadata || {};
      const specs = item.specs || {};
      const pricingStatus = getPricingStatus(item);

      const smpPlans = Array.isArray(metadata?.smp_pricing?.plans) ? metadata.smp_pricing.plans : [];
      const hasRenderableSmpPlans = smpPlans.some((plan: unknown) => hasRenderablePricingPlan(plan));
      const hasLegacyTiers =
        Array.isArray(metadata?.pricing?.tiers) && metadata.pricing.tiers.length > 0;
      const hasPricing = (hasRenderableSmpPlans || hasLegacyTiers) && pricingStatus === 'show';

      const hasOfficialPricingUrl = isHttpUrl(metadata?.smp_pricing?.pricing_page_url);
      const hardLimits = Array.isArray(specs?.constraints?.hard_limits)
        ? specs.constraints.hard_limits
        : [];
      const hiddenCosts = Array.isArray(specs?.constraints?.hidden_costs)
        ? specs.constraints.hidden_costs
        : [];
      const hasConstraintPricingEvidence = hardLimits.length > 0 || hiddenCosts.length > 0;
      const showPricingSection =
        pricingStatus !== 'hide' &&
        (hasPricing || hasOfficialPricingUrl || hasConstraintPricingEvidence);
      const showsFallback = showPricingSection && !hasPricing;

      if (!showsFallback) return null;

      const reasons: string[] = [];
      if (pricingStatus !== 'show') reasons.push(`section_status_${pricingStatus}`);
      if (!hasRenderableSmpPlans && !hasLegacyTiers) reasons.push('no_renderable_structured_pricing');
      if (!hasOfficialPricingUrl) reasons.push('no_official_pricing_url');
      if (!hasConstraintPricingEvidence) reasons.push('no_constraints_evidence');

      return {
        toolName: item.name,
        slug: item.slug,
        reasons,
        hasOfficialPricingUrl,
        priority: hasOfficialPricingUrl ? priorityOther : priorityMissing,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.priority - a.priority || a.toolName.localeCompare(b.toolName));

  const selected = fallbackCandidates.slice(0, limit);
  const names = selected.map((entry) => entry.toolName);

  const { data: existing, error: existingError } = await supabase
    .from('hunt_queue')
    .select('tool_name')
    .in('status', ['pending', 'claimed', 'processing'])
    .in('tool_name', names);

  if (existingError) {
    console.error(`Failed to check queue: ${existingError.message}`);
    process.exit(1);
  }

  const existingNames = new Set(((existing || []) as QueueRow[]).map((row) => row.tool_name));
  const toEnqueue = selected.filter((entry) => !existingNames.has(entry.toolName));

  const missingUrlCount = selected.filter((entry) => !entry.hasOfficialPricingUrl).length;
  const withUrlCount = selected.length - missingUrlCount;

  console.log('\nPricing Fallback Re-hunt Queue');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Candidates (after limit): ${selected.length}`);
  console.log(`Missing pricing URL (high priority): ${missingUrlCount}`);
  console.log(`Has pricing URL (normal priority): ${withUrlCount}`);
  console.log(`Already queued: ${existingNames.size}`);
  console.log(`To enqueue: ${toEnqueue.length}`);
  console.log(`Hunt type: ${huntType}`);
  console.log(`Priority (missing URL): ${priorityMissing}`);
  console.log(`Priority (other): ${priorityOther}`);

  if (toEnqueue.length > 0) {
    console.log('\nTools:');
    toEnqueue.forEach((entry, index) => {
      console.log(
        `  ${index + 1}. ${entry.toolName} [p${entry.priority}] (${entry.reasons.join(', ')})`
      );
    });
  }

  if (!apply || toEnqueue.length === 0) {
    if (!apply) {
      console.log('\nRun with --apply to enqueue fallback cohort re-hunts.');
    }
    return;
  }

  const rows = toEnqueue.map((entry) => ({
    tool_name: entry.toolName,
    context_title: null,
    category_slug: null,
    priority: entry.priority,
    source: 'scheduled',
    hunt_type: huntType as 'full' | 'refresh' | 'price_only',
    force_regenerate: true,
  }));

  const sourceCap = parseQueueCap(process.env.HUNT_QUEUE_SOURCE_PENDING_CAP, 400);
  const { current, remaining } = await getAvailableSourceSlots(supabase as any, 'scheduled', sourceCap);
  if (remaining <= 0) {
    console.log(
      `\nQueue source cap reached for "scheduled" (${current}/${sourceCap}). Skipping enqueue.`
    );
    return;
  }
  if (rows.length > remaining) {
    console.log(
      `\nQueue guardrail trimming rows from ${rows.length} to ${remaining} (scheduled pending ${current}/${sourceCap}).`
    );
    rows.length = remaining;
  }

  const { error: insertError } = await supabase.from('hunt_queue').insert(rows);
  if (insertError) {
    console.error(`Failed to enqueue fallback re-hunts: ${insertError.message}`);
    process.exit(1);
  }

  console.log(`\nEnqueued ${rows.length} re-hunt job(s).`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
