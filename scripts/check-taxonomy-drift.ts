#!/usr/bin/env npx tsx
/**
 * Taxonomy drift audit.
 *
 * Checks queued category slugs against canonical mapping and live categories table.
 * Fails by default when drift or unknown slugs are detected.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { normalizeCategorySlug } from '../src/lib/hunter/category-resolver';

config();

const warnOnly = process.argv.includes('--warn');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type QueueCategoryRow = {
  category_slug: string | null;
  detected_category: string | null;
};

async function run(): Promise<number> {
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('slug')
    .limit(1000);
  if (categoriesError) {
    console.error(`Failed to load categories: ${categoriesError.message}`);
    return 1;
  }
  const knownSlugs = new Set((categories || []).map((row) => row.slug));

  const { data: queueRows, error: queueError } = await supabase
    .from('hunt_queue')
    .select('category_slug, detected_category')
    .or('category_slug.not.is.null,detected_category.not.is.null')
    .limit(5000);
  if (queueError) {
    console.error(`Failed to load queue categories: ${queueError.message}`);
    return 1;
  }

  const observed = new Set<string>();
  for (const row of (queueRows || []) as QueueCategoryRow[]) {
    if (row.category_slug) observed.add(row.category_slug);
    if (row.detected_category) observed.add(row.detected_category);
  }

  const drifted: Array<{ original: string; canonical: string }> = [];
  const unknown: string[] = [];

  for (const slug of observed) {
    const canonical = normalizeCategorySlug(slug);
    if (!canonical) continue;

    if (canonical !== slug && knownSlugs.has(canonical)) {
      drifted.push({ original: slug, canonical });
      continue;
    }

    if (!knownSlugs.has(canonical) && !knownSlugs.has(slug)) {
      unknown.push(slug);
    }
  }

  console.log(`Known categories: ${knownSlugs.size}`);
  console.log(`Observed queue slugs: ${observed.size}`);
  console.log(`Drifted aliases: ${drifted.length}`);
  console.log(`Unknown slugs: ${unknown.length}`);

  if (drifted.length) {
    console.log('\nDrifted aliases (original -> canonical):');
    for (const row of drifted.slice(0, 50)) {
      console.log(`- ${row.original} -> ${row.canonical}`);
    }
  }

  if (unknown.length) {
    console.log('\nUnknown slugs:');
    for (const slug of unknown.slice(0, 50)) {
      console.log(`- ${slug}`);
    }
  }

  if (!warnOnly && (drifted.length > 0 || unknown.length > 0)) {
    return 1;
  }
  return 0;
}

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
