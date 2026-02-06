/**
 * Pricing Persistence Layer
 *
 * Syncs normalized pricing metrics to the database.
 * Called during hunter pipeline and can be run as backfill.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ToolSpecs } from '@/types/database';
import { normalizePricing } from './normalize';

/**
 * Compute and persist normalized pricing columns for a tool
 *
 * This should be called:
 * - After hunter extracts new pricing data
 * - When manually updating pricing via admin
 * - During backfill operations
 */
export async function updateNormalizedPricing(
  _supabase: SupabaseClient<Database>,
  _itemId: string,
  _specs: ToolSpecs
): Promise<{ success: boolean; error?: string }> {
  // Migration 024 removed redundant pricing columns.
  // Pricing is now computed on-demand via DB functions:
  // - get_starting_price_monthly(item_id)
  // - get_starting_price_annual(item_id)
  // - get_per_seat_price_monthly(item_id)
  // - get_comparison_plan(item_id)
  // - calculate_sso_tax(item_id)
  //
  // This function is now a no-op for backward compatibility.
  return { success: true };
}

/**
 * Backfill normalized pricing for all items with pricing_data
 *
 * Usage: npm run pricing:backfill
 */
export async function backfillNormalizedPricing(
  supabase: SupabaseClient<Database>,
  options: {
    batchSize?: number;
    dryRun?: boolean;
  } = {}
): Promise<{ processed: number; updated: number; failed: number; errors: string[] }> {
  const { batchSize = 50, dryRun = false } = options;

  console.log(`Starting pricing normalization backfill (dryRun: ${dryRun})...`);

  // Fetch all items with specs.pricing_data
  const { data: items, error: fetchError } = await supabase
    .from('items')
    .select('id, name, slug, specs')
    .not('specs->pricing_data', 'is', null)
    .limit(10000); // Safety limit

  if (fetchError) {
    console.error('Failed to fetch items:', fetchError);
    return { processed: 0, updated: 0, failed: 1, errors: [fetchError.message] };
  }

  if (!items || items.length === 0) {
    console.log('No items found with pricing_data');
    return { processed: 0, updated: 0, failed: 0, errors: [] };
  }

  console.log(`Found ${items.length} items to process`);

  let processed = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    for (const item of batch) {
      processed++;

      if (dryRun) {
        const specs = item.specs as ToolSpecs;
        const normalized = normalizePricing(specs.pricing_data);
        console.log(
          `[DRY RUN] ${item.name}: ${normalized?.display.starting_from || 'No pricing'} ${normalized?.display.caveat || ''}`
        );
        updated++;
      } else {
        const result = await updateNormalizedPricing(supabase, item.id, item.specs as ToolSpecs);

        if (result.success) {
          updated++;
          console.log(`✓ ${item.name} (${item.slug})`);
        } else {
          failed++;
          const errorMsg = `${item.name}: ${result.error}`;
          errors.push(errorMsg);
          console.error(`✗ ${errorMsg}`);
        }
      }
    }

    // Progress update
    console.log(
      `Progress: ${processed}/${items.length} (${Math.round((processed / items.length) * 100)}%)`
    );
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  return { processed, updated, failed, errors };
}
