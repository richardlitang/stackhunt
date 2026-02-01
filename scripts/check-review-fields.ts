import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkFields() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('\n📋 Comparing items.metadata vs reviews fields\n');

  // Get a sample item with full metadata
  const { data: sampleItem } = await supabase
    .from('items')
    .select('metadata, specs')
    .not('metadata', 'is', null)
    .limit(1)
    .single();

  if (sampleItem) {
    console.log('=== Fields in items.metadata ===');
    if (sampleItem.metadata) {
      Object.keys(sampleItem.metadata).forEach(key => {
        console.log(`  - ${key}`);
      });
    }

    console.log('\n=== Fields in items.specs ===');
    if (sampleItem.specs) {
      Object.keys(sampleItem.specs).forEach(key => {
        console.log(`  - ${key}`);
      });
    }
  }

  // Get a sample review
  const { data: sampleReview } = await supabase
    .from('reviews')
    .select('*')
    .limit(1)
    .single();

  if (sampleReview) {
    console.log('\n=== Fields in reviews table ===');
    Object.keys(sampleReview).forEach(key => {
      if (sampleReview[key] !== null || key === 'context_id') {
        console.log(`  - ${key}: ${typeof sampleReview[key]}`);
      }
    });
  }

  // Check which metadata fields might belong in reviews
  console.log('\n🔍 Potential fields to migrate:\n');

  const { data: items } = await supabase
    .from('items')
    .select('id, name, metadata, specs')
    .not('specs', 'is', null)
    .limit(5);

  items?.forEach(item => {
    const hasVerdict = item.metadata?.human_verdict;
    const hasUserAdvocate = item.metadata?.user_advocate;
    const hasBudgetAnalyst = item.metadata?.budget_analyst;
    const hasReviewContext = item.metadata?.review_context;

    if (hasVerdict || hasUserAdvocate || hasBudgetAnalyst || hasReviewContext) {
      console.log(`${item.name}:`);
      if (hasVerdict) console.log(`  ✓ human_verdict (item-level summary)`);
      if (hasUserAdvocate) console.log(`  ✓ user_advocate (vibe, ideal_for, avoid_if)`);
      if (hasBudgetAnalyst) console.log(`  ✓ budget_analyst (cost_drivers)`);
      if (hasReviewContext) console.log(`  ✓ review_context (sources, analysis)`);
    }
  });
}

checkFields();
