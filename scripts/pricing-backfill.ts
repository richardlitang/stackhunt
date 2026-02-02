#!/usr/bin/env npx tsx
/**
 * Pricing Normalization Backfill Script
 *
 * Computes normalized pricing metrics for all existing tools and updates DB columns.
 *
 * Usage:
 *   npm run pricing:backfill              # Update all tools
 *   npm run pricing:backfill -- --dry-run # Preview without updating
 *   npm run pricing:backfill -- --batch 100 # Process in batches of 100
 */

import { config } from 'dotenv';

async function main() {
  // Load environment variables FIRST
  config();

  // Dynamic imports after env vars are loaded
  const { supabaseAdmin } = await import('../src/lib/supabase.js');
  const { backfillNormalizedPricing } = await import('../src/lib/pricing/persist.js');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch'));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1] || '50') : 50;

  console.log('='.repeat(60));
  console.log('PRICING NORMALIZATION BACKFILL');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE UPDATE'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log('='.repeat(60));
  console.log('');

  if (!dryRun) {
    console.log('⚠️  This will update the database. Press Ctrl+C to cancel...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const result = await backfillNormalizedPricing(supabaseAdmin, {
    batchSize,
    dryRun,
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Processed: ${result.processed}`);
  console.log(`✓ Updated: ${result.updated}`);
  console.log(`✗ Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log('');
    console.log('Errors:');
    result.errors.forEach(err => console.log(`  - ${err}`));
  }

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
