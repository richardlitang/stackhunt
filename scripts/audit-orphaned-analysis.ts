import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function auditOrphanedAnalysis() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n🔍 AUDIT: Items with analysis but no reviews\n');

  // Get all items
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, created_at, specs, metadata')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total items: ${items?.length || 0}\n`);

  // Find items with specs.pros/cons
  const itemsWithSpecs = items?.filter(item => {
    const hasPros = item.specs?.pros && item.specs.pros.length > 0;
    const hasCons = item.specs?.cons && item.specs.cons.length > 0;
    return hasPros || hasCons;
  }) || [];

  console.log(`Items with pros/cons in specs: ${itemsWithSpecs.length}\n`);

  // Check which ones have reviews
  const orphanedItems = [];

  for (const item of itemsWithSpecs) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, context_id, score, status')
      .eq('item_id', item.id);

    const hasReviews = reviews && reviews.length > 0;
    const prosCount = item.specs?.pros?.length || 0;
    const consCount = item.specs?.cons?.length || 0;

    if (!hasReviews) {
      orphanedItems.push({
        id: item.id,
        name: item.name,
        created_at: item.created_at,
        pros: prosCount,
        cons: consCount,
        score: item.metadata?.analysis?.score || null,
        verdict: item.metadata?.human_verdict || null,
      });
    }

    console.log(`${hasReviews ? '✅' : '❌'} ${item.name}`);
    console.log(`   Pros: ${prosCount}, Cons: ${consCount}, Reviews: ${reviews?.length || 0}`);
    if (!hasReviews) {
      console.log(`   ⚠️  ORPHANED - Analysis exists but no review created`);
    }
    console.log('');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total items with specs: ${itemsWithSpecs.length}`);
  console.log(`   Items with reviews: ${itemsWithSpecs.length - orphanedItems.length}`);
  console.log(`   ORPHANED (no reviews): ${orphanedItems.length}`);

  if (orphanedItems.length > 0) {
    console.log('\n🚨 ORPHANED ITEMS (need migration):\n');
    orphanedItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Pros: ${item.pros}, Cons: ${item.cons}, Score: ${item.score || 'N/A'}`);
      console.log(`   Created: ${new Date(item.created_at).toLocaleString()}`);
      console.log('');
    });
  }
}

auditOrphanedAnalysis();
