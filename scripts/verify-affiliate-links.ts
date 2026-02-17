#!/usr/bin/env tsx
/**
 * Affiliate Link Health Worker
 *
 * Verifies affiliate links are still active and accessible.
 * Run this as a cron job (e.g., daily at 3am):
 *   0 3 * * * cd /path/to/washington && tsx scripts/verify-affiliate-links.ts
 *
 * What it does:
 * 1. Fetches all active affiliate links from the database
 * 2. Performs HEAD requests to verify each link is reachable
 * 3. Updates verification_status and last_verified_at in the database
 * 4. Auto-disables links that have been broken for 7+ days (via trigger)
 *
 * Network Tier Strategy:
 * - Tier 1 (PartnerStack/Impact): Verify via API (future enhancement)
 * - Tier 2 (ShareASale/CJ): HTTP HEAD request only
 * - Tier 3 (Manual/Rewardful): HTTP HEAD request only
 *
 * @module scripts/verify-affiliate-links
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import 'dotenv/config';

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '❌ Missing required environment variables: SUPABASE_URL, and SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const MAX_CONCURRENT_CHECKS = 10; // Parallel requests limit
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const USER_AGENT = 'StackHunt-LinkVerifier/1.0 (affiliate link health check)';

interface VerificationResult {
  offerId: string;
  url: string;
  status: 'healthy' | 'broken' | 'expired' | 'unknown';
  statusCode?: number;
  error?: string;
}

/**
 * Verify a single affiliate link via HTTP HEAD request
 */
async function verifyLink(
  offerId: string,
  url: string,
  signal: AbortSignal
): Promise<VerificationResult> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow', // Follow redirects (affiliate links often redirect)
      signal,
    });

    // Determine status based on HTTP response
    if (response.ok) {
      return { offerId, url, status: 'healthy', statusCode: response.status };
    } else if (response.status === 404 || response.status === 410) {
      return { offerId, url, status: 'broken', statusCode: response.status };
    } else if (response.status >= 500) {
      // Server error - might be temporary, mark as unknown
      return { offerId, url, status: 'unknown', statusCode: response.status };
    } else {
      return { offerId, url, status: 'broken', statusCode: response.status };
    }
  } catch (error: any) {
    // Network errors, timeouts, etc.
    return {
      offerId,
      url,
      status: 'unknown',
      error: error.message || 'Network error',
    };
  }
}

/**
 * Batch verify links with concurrency control
 */
async function verifyLinksInBatches(
  offers: Array<{ id: string; url: string }>
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  const batches: Array<typeof offers> = [];

  // Split into batches
  for (let i = 0; i < offers.length; i += MAX_CONCURRENT_CHECKS) {
    batches.push(offers.slice(i, i + MAX_CONCURRENT_CHECKS));
  }

  // Process each batch sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`🔍 Verifying batch ${i + 1}/${batches.length} (${batch.length} links)...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const batchResults = await Promise.all(
      batch.map((offer) => verifyLink(offer.id, offer.url, controller.signal))
    );

    clearTimeout(timeoutId);
    results.push(...batchResults);

    // Rate limiting - wait 1 second between batches
    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Update database with verification results
 */
async function updateVerificationResults(results: VerificationResult[]): Promise<void> {
  console.log('💾 Updating database with verification results...');

  // Update each offer individually (batch update would be better but more complex)
  for (const result of results) {
    const { error } = await supabase
      .from('affiliate_offers')
      .update({
        verification_status: result.status,
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', result.offerId);

    if (error) {
      console.error(`❌ Failed to update offer ${result.offerId}:`, error.message);
    }
  }
}

/**
 * Main worker function
 */
async function main() {
  console.log('🚀 Starting affiliate link verification worker...');
  console.log(`📅 ${new Date().toISOString()}`);

  // Fetch all active affiliate links
  const { data: offers, error: fetchError } = await supabase
    .from('affiliate_offers')
    .select('id, url, network_tier, last_verified_at')
    .eq('is_active', true)
    .order('network_tier', { ascending: false }) // Tier 1 first (most important)
    .order('priority', { ascending: true });

  if (fetchError) {
    console.error('❌ Failed to fetch affiliate offers:', fetchError.message);
    process.exit(1);
  }

  if (!offers || offers.length === 0) {
    console.log('✅ No active affiliate links to verify.');
    process.exit(0);
  }

  console.log(`📊 Found ${offers.length} active affiliate links to verify.`);

  // Filter: Only verify links that haven't been checked in the last 24 hours
  const offersToVerify = offers.filter((offer) => {
    if (!offer.last_verified_at) return true;
    const lastVerified = new Date(offer.last_verified_at);
    const hoursSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60);
    return hoursSinceVerification >= 24;
  });

  if (offersToVerify.length === 0) {
    console.log('✅ All links were verified within the last 24 hours. Skipping.');
    process.exit(0);
  }

  console.log(`🔄 ${offersToVerify.length} links need verification (>24h since last check).`);

  // Verify links
  const results = await verifyLinksInBatches(offersToVerify);

  // Update database
  await updateVerificationResults(results);

  // Summary statistics
  const healthy = results.filter((r) => r.status === 'healthy').length;
  const broken = results.filter((r) => r.status === 'broken').length;
  const unknown = results.filter((r) => r.status === 'unknown').length;

  console.log('\n📈 Verification Summary:');
  console.log(`✅ Healthy: ${healthy}`);
  console.log(`❌ Broken: ${broken}`);
  console.log(`⚠️  Unknown: ${unknown}`);

  // List broken links for manual review
  if (broken > 0) {
    console.log('\n🚨 Broken Links (require manual review):');
    results
      .filter((r) => r.status === 'broken')
      .forEach((r) => {
        console.log(`   - ${r.url} (HTTP ${r.statusCode || 'N/A'})`);
      });
  }

  console.log('\n✅ Affiliate link verification complete.');
  process.exit(0);
}

// Run the worker
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
