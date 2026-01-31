#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkQuality() {
  const { data: items, error } = await supabase
    .from('items')
    .select('name, specs, pricing_confidence, pricing_verified_at, review_context')
    .in('name', ['Obsidian', 'Monday.com', 'ClickUp', 'Wrike', 'Microsoft 365'])
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n📊 TRIBAL KNOWLEDGE QUALITY CHECK\n');
  console.log('='.repeat(80));

  for (const item of items || []) {
    console.log(`\n📦 ${item.name}`);
    console.log('-'.repeat(80));

    // review_context is a TOP-LEVEL column, not inside specs
    const rc = item.review_context;

    // Human Verdict
    console.log('\n🗣️  HUMAN VERDICT:');
    console.log(`   ${rc?.humanVerdict || '❌ MISSING'}`);

    // Budget Analyst
    console.log('\n💰 BUDGET ANALYST:');
    if (rc?.budgetAnalyst) {
      console.log(`   Cost Drivers: ${rc.budgetAnalyst.costDrivers?.length || 0}`);
      rc.budgetAnalyst.costDrivers?.forEach((d: string) => console.log(`      • ${d}`));
      console.log(`   One-time Fees: ${rc.budgetAnalyst.oneTimeFees?.length || 0}`);
      console.log(`   ROI Threshold: ${rc.budgetAnalyst.roiThreshold || 'N/A'}`);
    } else {
      console.log('   ❌ MISSING');
    }

    // User Advocate
    console.log('\n👥 USER ADVOCATE:');
    if (rc?.userAdvocate) {
      console.log(`   Vibe: "${rc.userAdvocate.vibe}" ← THIS IS THE "HACKER CHIC" THING`);
      console.log(`   Ideal For: ${rc.userAdvocate.idealFor?.length || 0} items`);
      rc.userAdvocate.idealFor?.forEach((i: string) => console.log(`      ✓ ${i}`));
      console.log(`   Avoid If: ${rc.userAdvocate.avoidIf?.length || 0} items`);
      rc.userAdvocate.avoidIf?.forEach((a: string) => console.log(`      ✗ ${a}`));
      console.log(`   Power Tip: ${rc.userAdvocate.powerTip || 'N/A'}`);
    } else {
      console.log('   ❌ MISSING');
    }

    // Pricing with target_audience
    console.log('\n💵 PRICING DATA:');
    const pricing = item.specs?.smp_pricing;
    if (pricing) {
      console.log(`   Model: ${pricing.pricing_model}`);
      console.log(`   Confidence: ${item.pricing_confidence || pricing.pricing_confidence}`);
      console.log(`   Plans: ${pricing.pricing_data?.plans?.length || 0}`);

      // Check target_audience in plans
      const plansWithAudience = pricing.pricing_data?.plans?.filter((p: any) => p.target_audience) || [];
      console.log(`   Plans with target_audience: ${plansWithAudience.length}/${pricing.pricing_data?.plans?.length || 0}`);

      if (plansWithAudience.length > 0) {
        console.log('   Sample:');
        plansWithAudience.slice(0, 3).forEach((p: any) => {
          console.log(`      • ${p.name}: ${p.target_audience}`);
        });
      } else {
        console.log('   ⚠️  NO PLANS HAVE target_audience FIELD!');
      }
    } else {
      console.log('   ❌ NO PRICING DATA');
    }
  }

  console.log('\n' + '='.repeat(80));
}

checkQuality();
