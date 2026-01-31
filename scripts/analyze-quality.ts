#!/usr/bin/env npx tsx
/**
 * Analyze tribal knowledge quality for recently processed items
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QualityIssue {
  tool: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
}

async function analyzeQuality() {
  // Get items updated in last 30 minutes
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from('items')
    .select('name, review_context, specs, updated_at')
    .gte('updated_at', thirtyMinsAgo)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`\n📊 QUALITY ANALYSIS - ${items?.length || 0} items updated in last 30 mins\n`);
  console.log('='.repeat(80));

  const issues: QualityIssue[] = [];
  const stats = {
    total: items?.length || 0,
    hasVerdict: 0,
    hasVibe: 0,
    hasCostDrivers: 0,
    hasIdealFor: 0,
    hasPowerTip: 0,
    hasTargetAudience: 0,
    avgIdealForCount: 0,
    avgCostDriverCount: 0,
  };

  for (const item of items || []) {
    console.log(`\n📦 ${item.name}`);
    console.log('-'.repeat(80));

    const rc = item.review_context;
    const pricing = item.specs?.smp_pricing;

    // Check Human Verdict
    if (!rc?.humanVerdict) {
      issues.push({ tool: item.name, severity: 'critical', issue: 'Missing humanVerdict' });
      console.log('❌ CRITICAL: No humanVerdict');
    } else if (rc.humanVerdict.length < 50) {
      issues.push({ tool: item.name, severity: 'warning', issue: 'humanVerdict too short' });
      console.log(`⚠️  WARNING: humanVerdict too short (${rc.humanVerdict.length} chars)`);
      stats.hasVerdict++;
    } else {
      console.log(`✅ humanVerdict (${rc.humanVerdict.length} chars)`);
      stats.hasVerdict++;
    }

    // Check Budget Analyst
    if (!rc?.budgetAnalyst) {
      issues.push({ tool: item.name, severity: 'critical', issue: 'Missing budgetAnalyst' });
      console.log('❌ CRITICAL: No budgetAnalyst');
    } else {
      const drivers = rc.budgetAnalyst.costDrivers || [];
      stats.avgCostDriverCount += drivers.length;
      if (drivers.length === 0) {
        issues.push({ tool: item.name, severity: 'warning', issue: 'No cost drivers' });
        console.log('⚠️  WARNING: No cost drivers');
      } else {
        console.log(`✅ ${drivers.length} cost drivers`);
        stats.hasCostDrivers++;
      }
    }

    // Check User Advocate
    if (!rc?.userAdvocate) {
      issues.push({ tool: item.name, severity: 'critical', issue: 'Missing userAdvocate' });
      console.log('❌ CRITICAL: No userAdvocate');
    } else {
      // Check vibe
      if (!rc.userAdvocate.vibe) {
        issues.push({ tool: item.name, severity: 'warning', issue: 'Missing vibe' });
        console.log('⚠️  WARNING: No vibe');
      } else {
        const genericVibes = ['professional', 'standard', 'modern', 'simple'];
        const isGeneric = genericVibes.some(v =>
          rc.userAdvocate.vibe.toLowerCase().includes(v)
        );
        if (isGeneric) {
          issues.push({ tool: item.name, severity: 'info', issue: `Generic vibe: "${rc.userAdvocate.vibe}"` });
          console.log(`ℹ️  INFO: Generic vibe "${rc.userAdvocate.vibe}"`);
        } else {
          console.log(`✅ Vibe: "${rc.userAdvocate.vibe}"`);
        }
        stats.hasVibe++;
      }

      // Check idealFor
      const idealFor = rc.userAdvocate.idealFor || [];
      stats.avgIdealForCount += idealFor.length;
      if (idealFor.length === 0) {
        issues.push({ tool: item.name, severity: 'warning', issue: 'No idealFor personas' });
        console.log('⚠️  WARNING: No idealFor personas');
      } else {
        console.log(`✅ ${idealFor.length} idealFor personas`);
        stats.hasIdealFor++;
      }

      // Check powerTip
      if (!rc.userAdvocate.powerTip) {
        issues.push({ tool: item.name, severity: 'info', issue: 'No power tip' });
        console.log('ℹ️  INFO: No power tip');
      } else {
        console.log(`✅ Power tip: "${rc.userAdvocate.powerTip.slice(0, 50)}..."`);
        stats.hasPowerTip++;
      }
    }

    // Check pricing target_audience
    if (pricing?.pricing_data?.plans) {
      const plansWithAudience = pricing.pricing_data.plans.filter(
        (p: any) => p.target_audience
      );
      if (plansWithAudience.length === 0) {
        issues.push({ tool: item.name, severity: 'warning', issue: 'No plans have target_audience' });
        console.log('⚠️  WARNING: No plans have target_audience');
      } else {
        const coverage = (plansWithAudience.length / pricing.pricing_data.plans.length) * 100;
        console.log(`✅ ${coverage.toFixed(0)}% plans have target_audience (${plansWithAudience.length}/${pricing.pricing_data.plans.length})`);
        stats.hasTargetAudience++;
      }
    }
  }

  // Calculate averages
  if (stats.total > 0) {
    stats.avgIdealForCount = stats.avgIdealForCount / stats.total;
    stats.avgCostDriverCount = stats.avgCostDriverCount / stats.total;
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 SUMMARY STATISTICS\n');
  console.log(`Total items analyzed: ${stats.total}`);
  console.log(`Items with humanVerdict: ${stats.hasVerdict} (${(stats.hasVerdict/stats.total*100).toFixed(0)}%)`);
  console.log(`Items with vibe: ${stats.hasVibe} (${(stats.hasVibe/stats.total*100).toFixed(0)}%)`);
  console.log(`Items with cost drivers: ${stats.hasCostDrivers} (${(stats.hasCostDrivers/stats.total*100).toFixed(0)}%)`);
  console.log(`Items with idealFor: ${stats.hasIdealFor} (${(stats.hasIdealFor/stats.total*100).toFixed(0)}%)`);
  console.log(`Items with power tip: ${stats.hasPowerTip} (${(stats.hasPowerTip/stats.total*100).toFixed(0)}%)`);
  console.log(`Items with target_audience: ${stats.hasTargetAudience} (${(stats.hasTargetAudience/stats.total*100).toFixed(0)}%)`);
  console.log(`\nAverage idealFor count: ${stats.avgIdealForCount.toFixed(1)}`);
  console.log(`Average cost driver count: ${stats.avgCostDriverCount.toFixed(1)}`);

  // Print issues by severity
  console.log('\n' + '='.repeat(80));
  console.log('\n🚨 ISSUES FOUND\n');

  const critical = issues.filter(i => i.severity === 'critical');
  const warnings = issues.filter(i => i.severity === 'warning');
  const info = issues.filter(i => i.severity === 'info');

  if (critical.length > 0) {
    console.log(`❌ CRITICAL (${critical.length}):`);
    critical.forEach(i => console.log(`   ${i.tool}: ${i.issue}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(i => console.log(`   ${i.tool}: ${i.issue}`));
  }

  if (info.length > 0) {
    console.log(`\nℹ️  INFO (${info.length}):`);
    info.forEach(i => console.log(`   ${i.tool}: ${i.issue}`));
  }

  if (issues.length === 0) {
    console.log('✅ No issues found!');
  }

  console.log('\n' + '='.repeat(80));
}

analyzeQuality();
