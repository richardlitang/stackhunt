#!/usr/bin/env npx tsx
/**
 * Final summary of re-hunting campaign
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateSummary() {
  // Get all items with review_context
  const { data: items, error } = await supabase
    .from('items')
    .select('name, review_context, specs, updated_at')
    .not('review_context', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     RE-HUNTING CAMPAIGN - FINAL SUMMARY                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Overall stats
  const stats = {
    total: items?.length || 0,
    withVerdict: 0,
    withVibe: 0,
    withCostDrivers: 0,
    withIdealFor: 0,
    withPowerTip: 0,
    withTargetAudience: 0,
    genericVibes: [] as string[],
    uniqueVibes: new Set<string>(),
    avgCostDrivers: 0,
    avgIdealFor: 0,
  };

  const vibeDistribution: Record<string, number> = {};
  const genericVibePhrases = ['professional', 'simple', 'modern', 'standard', 'traditional', 'unknown'];

  for (const item of items || []) {
    const rc = item.review_context;

    if (rc?.humanVerdict) stats.withVerdict++;
    if (rc?.budgetAnalyst?.costDrivers?.length) {
      stats.withCostDrivers++;
      stats.avgCostDrivers += rc.budgetAnalyst.costDrivers.length;
    }
    if (rc?.userAdvocate?.vibe) {
      stats.withVibe++;
      stats.uniqueVibes.add(rc.userAdvocate.vibe);
      vibeDistribution[rc.userAdvocate.vibe] = (vibeDistribution[rc.userAdvocate.vibe] || 0) + 1;

      const isGeneric = genericVibePhrases.some(phrase =>
        rc.userAdvocate.vibe.toLowerCase().includes(phrase)
      );
      if (isGeneric) {
        stats.genericVibes.push(`${item.name}: "${rc.userAdvocate.vibe}"`);
      }
    }
    if (rc?.userAdvocate?.idealFor?.length) {
      stats.withIdealFor++;
      stats.avgIdealFor += rc.userAdvocate.idealFor.length;
    }
    if (rc?.userAdvocate?.powerTip) stats.withPowerTip++;

    // Check target_audience in pricing
    const plans = item.specs?.pricing_data?.plans || [];
    const plansWithAudience = plans.filter((p: any) => p.target_audience);
    if (plansWithAudience.length > 0) stats.withTargetAudience++;
  }

  stats.avgCostDrivers = stats.avgCostDrivers / stats.total;
  stats.avgIdealFor = stats.avgIdealFor / stats.total;

  // Print stats
  console.log('📊 COVERAGE STATISTICS\n');
  console.log(`Total items processed: ${stats.total}`);
  console.log(`  ✅ Human Verdict:     ${stats.withVerdict} (${(stats.withVerdict/stats.total*100).toFixed(0)}%)`);
  console.log(`  ✅ Vibe:              ${stats.withVibe} (${(stats.withVibe/stats.total*100).toFixed(0)}%)`);
  console.log(`  ✅ Cost Drivers:      ${stats.withCostDrivers} (${(stats.withCostDrivers/stats.total*100).toFixed(0)}%)`);
  console.log(`  ✅ Ideal For:         ${stats.withIdealFor} (${(stats.withIdealFor/stats.total*100).toFixed(0)}%)`);
  console.log(`  ✅ Power Tip:         ${stats.withPowerTip} (${(stats.withPowerTip/stats.total*100).toFixed(0)}%)`);
  console.log(`  ⚠️  Target Audience:  ${stats.withTargetAudience} (${(stats.withTargetAudience/stats.total*100).toFixed(0)}%)`);

  console.log(`\n📈 AVERAGES\n`);
  console.log(`  Cost Drivers/item:  ${stats.avgCostDrivers.toFixed(1)}`);
  console.log(`  Ideal For/item:     ${stats.avgIdealFor.toFixed(1)}`);
  console.log(`  Unique vibes:       ${stats.uniqueVibes.size}`);

  console.log(`\n🎨 VIBE DISTRIBUTION (Top 10)\n`);
  const topVibes = Object.entries(vibeDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [vibe, count] of topVibes) {
    const bar = '█'.repeat(Math.ceil(count / stats.total * 50));
    console.log(`  ${vibe.padEnd(25)} ${bar} ${count}`);
  }

  if (stats.genericVibes.length > 0) {
    console.log(`\n⚠️  GENERIC VIBES (${stats.genericVibes.length})\n`);
    stats.genericVibes.slice(0, 10).forEach(v => console.log(`  ${v}`));
    if (stats.genericVibes.length > 10) {
      console.log(`  ... and ${stats.genericVibes.length - 10} more`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Re-hunting campaign complete!\n');
}

generateSummary();
