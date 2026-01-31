/**
 * Backfill categories for existing items based on taxonomy data
 *
 * Usage:
 *   npm run ts-node scripts/backfill-categories.ts
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Mapping from primary_function to category slug
const funcToCategory: Record<string, string> = {
  'Project Management': 'project-management',
  'Communication': 'communication',
  'Notetaking': 'notetaking',
  'Note-Taking': 'notetaking',
  'Developer Tools': 'developer-tools',
  'Code Editor': 'developer-tools',
  'Development': 'developer-tools',
  'Design': 'design',
  'CRM': 'crm-sales',
  'Collaboration': 'collaboration',
  'Productivity': 'productivity',
  'AI & Automation': 'ai-automation',
  'AI Code Assistant': 'ai-automation',
  'AI Tools': 'ai-automation',
  'AI Audio Platform': 'ai-automation',
  'Analytics': 'seo-analytics',
  'SEO': 'seo-analytics',
  'SEO Tools': 'seo-analytics',
  'Email Marketing': 'email-marketing',
  'Social Media': 'social-media',
  'Customer Support': 'customer-support',
  'HR': 'hr-recruiting',
  'HR & Payroll': 'hr-recruiting',
  'Accounting': 'accounting',
  'Accounting Software': 'accounting',
  'Finance': 'accounting',
  'Spend Management': 'accounting',
  'Business Banking': 'payments',
  'Payments': 'payments',
  'Video Editing': 'video-editing',
  'Practice Management': 'healthcare',
  'Dental Practice Management': 'healthcare',
  'Automation': 'ai-automation',
  'Website Builder': 'no-code',
};

async function main() {
  console.log('🔄 Backfilling categories for items...\n');

  // Fetch all items without categories
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, specs, category_id')
    .is('category_id', null);

  if (error) {
    console.error('Error fetching items:', error);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log('✅ No items need category assignment');
    return;
  }

  console.log(`Found ${items.length} items without categories\n`);

  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const taxonomy = (item.specs as any)?.taxonomy;
    const primaryFunction = taxonomy?.primary_function;

    if (!primaryFunction) {
      console.log(`⏭️  ${item.name}: No taxonomy data`);
      skipped++;
      continue;
    }

    const categorySlug = funcToCategory[primaryFunction];
    if (!categorySlug) {
      console.log(`⚠️  ${item.name}: No mapping for "${primaryFunction}"`);
      skipped++;
      continue;
    }

    // Find category ID
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('slug', categorySlug)
      .eq('type', 'function')
      .maybeSingle();

    if (!category) {
      console.log(`❌ ${item.name}: Category "${categorySlug}" not found`);
      skipped++;
      continue;
    }

    // Update item
    const { error: updateError } = await supabase
      .from('items')
      .update({ category_id: category.id })
      .eq('id', item.id);

    if (updateError) {
      console.error(`❌ ${item.name}: Update failed:`, updateError);
      skipped++;
      continue;
    }

    console.log(`✅ ${item.name}: Assigned to "${category.name}"`);
    updated++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${items.length}`);
}

main().catch(console.error);
