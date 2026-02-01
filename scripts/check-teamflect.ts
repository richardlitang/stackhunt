import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTeamflect() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('*')
    .eq('name', 'Teamflect')
    .single();

  if (itemError) {
    console.error('Error fetching item:', itemError);
    return;
  }

  console.log('\n=== TEAMFLECT DATA ===\n');
  console.log('ID:', item.id);
  console.log('Name:', item.name);
  console.log('Website:', item.website);
  console.log('Created:', new Date(item.created_at).toLocaleString());
  console.log('\nPricing Model:', item.metadata?.smp_pricing?.model);
  console.log('Plans:', item.metadata?.smp_pricing?.plans?.length || 0);

  // Check pros/cons
  const pros = item.pros || [];
  const cons = item.cons || [];
  console.log('\n--- Item Content ---');
  console.log('Pros (item.pros):', pros.length);
  console.log('Cons (item.cons):', cons.length);

  // Check metadata
  console.log('\n--- Metadata ---');
  console.log('user_advocate exists?', item.metadata?.user_advocate ? 'YES' : 'NO');
  console.log('budget_analyst exists?', item.metadata?.budget_analyst ? 'YES' : 'NO');

  if (item.metadata?.user_advocate) {
    console.log('\nUser Advocate:');
    console.log('  Vibe:', item.metadata.user_advocate.vibe);
    console.log('  Ideal For:', item.metadata.user_advocate.ideal_for?.length || 0);
    console.log('  Avoid If:', item.metadata.user_advocate.avoid_if?.length || 0);
  }

  // Check for reviews
  const { data: reviews, error: reviewError } = await supabase
    .from('reviews')
    .select('*')
    .eq('item_id', item.id);

  console.log('\n--- Reviews ---');
  console.log('Total reviews:', reviews?.length || 0);

  if (reviews && reviews.length > 0) {
    reviews.forEach((review, i) => {
      console.log(`\nReview ${i + 1}:`);
      console.log('  Context:', review.context_id);
      console.log('  Score:', review.score);
      console.log('  Status:', review.status);
      console.log('  Quality:', review.quality);
      console.log('  Pros:', review.pros?.length || 0);
      console.log('  Cons:', review.cons?.length || 0);
    });
  }
}

checkTeamflect();
