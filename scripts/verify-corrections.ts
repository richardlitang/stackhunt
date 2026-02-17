#!/usr/bin/env npx tsx
/**
 * Corrections Verification CLI
 *
 * Verifies user-submitted corrections using AI.
 * Run this weekly via GitHub Actions or manually:
 *   npm run verify-corrections
 *
 * Logic:
 * - If pending corrections >= 50 OR oldest pending > 30 days: Run AI verification
 * - Otherwise: Just log summary, skip AI
 *
 * @module scripts/verify-corrections
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import axios from 'axios';

// Load environment variables
import { config } from 'dotenv';
config();

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configuration
const PENDING_THRESHOLD = 50;
const AGE_THRESHOLD_DAYS = 30;
const MAX_TOOLS_PER_RUN = 50;

interface VerificationStats {
  pending_count: number;
  oldest_days: number;
  unique_tools: number;
  should_verify: boolean;
}

interface CorrectionGroup {
  tool_id: string;
  tool_name: string;
  tool_slug: string;
  tool_website: string | null;
  correction_count: number;
  correction_ids: string[];
  field_names: string[];
}

interface VerificationResult {
  correctionId: string;
  result: 'confirmed' | 'rejected' | 'inconclusive';
  notes: string;
  tokensUsed: number;
}

/**
 * Search for current data about a tool
 */
async function searchForData(toolName: string, fieldName: string): Promise<string[]> {
  if (!SERPER_API_KEY) return [];

  const queryMap: Record<string, string> = {
    pricing: `${toolName} pricing plans cost per month`,
    pros: `${toolName} advantages benefits review`,
    cons: `${toolName} disadvantages limitations review`,
    summary: `${toolName} what is overview features`,
    score: `${toolName} rating review score`,
    other: `${toolName} official information`,
  };

  const query = queryMap[fieldName] || queryMap.other;

  try {
    const response = await axios.post<{
      organic?: Array<{ title: string; snippet: string; link: string }>;
    }>(
      'https://google.serper.dev/search',
      { q: query, num: 5 },
      {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.organic?.map(
      (r) => `[${r.link}] ${r.title}: ${r.snippet}`
    ) || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Verify a correction using AI
 */
async function verifyCorrection(
  gemini: GoogleGenAI,
  toolName: string,
  fieldName: string,
  correctionText: string,
  searchResults: string[]
): Promise<{ result: 'confirmed' | 'rejected' | 'inconclusive'; notes: string; tokensUsed: number }> {
  const prompt = `You are a fact-checker verifying a user-submitted correction about software.

TOOL: ${toolName}
FIELD: ${fieldName}
USER CLAIM: "${correctionText}"

SEARCH RESULTS:
${searchResults.join('\n\n')}

Based on the search results, determine if the user's claim is:
1. CONFIRMED - The search results support the user's claim
2. REJECTED - The search results contradict the user's claim
3. INCONCLUSIVE - Not enough information to verify

Respond with ONLY valid JSON:
{
  "result": "confirmed" | "rejected" | "inconclusive",
  "notes": "Brief explanation (1-2 sentences)"
}`;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Fast verification
        },
      },
    });

    const content = response.text;

    if (!content) {
      return { result: 'inconclusive', notes: 'AI returned empty response.', tokensUsed: 0 };
    }

    const parsed = JSON.parse(content) as { result: 'confirmed' | 'rejected' | 'inconclusive'; notes: string };
    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

    return { result: parsed.result, notes: parsed.notes, tokensUsed };
  } catch (error) {
    return {
      result: 'inconclusive',
      notes: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: 0,
    };
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(message: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;

  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (error) {
    console.error('Slack notification failed:', error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Starting corrections verification...');
  console.log(`📅 ${new Date().toISOString()}\n`);

  // 1. Get verification stats
  const { data: statsData, error: statsError } = await supabase.rpc('get_verification_stats');

  if (statsError) {
    console.warn(`⚠️ Verification stats unavailable (${statsError.message}). Skipping corrections verification.`);
    process.exit(0);
  }

  const stats = statsData as VerificationStats;
  console.log('📊 Current Stats:');
  console.log(`   Pending corrections: ${stats.pending_count}`);
  console.log(`   Oldest pending: ${stats.oldest_days} days`);
  console.log(`   Unique tools: ${stats.unique_tools}`);
  console.log(`   Should verify: ${stats.should_verify}\n`);

  // 2. Check if we should run verification
  if (!stats.should_verify) {
    console.log(`✅ Below thresholds (pending: ${stats.pending_count}/${PENDING_THRESHOLD}, oldest: ${stats.oldest_days}/${AGE_THRESHOLD_DAYS} days)`);
    console.log('   Skipping AI verification.\n');

    await sendSlackNotification(
      `📋 Weekly Corrections Summary: ${stats.pending_count} pending corrections across ${stats.unique_tools} tools. Below threshold - no AI verification needed.`
    );

    process.exit(0);
  }

  // 3. Check for required API keys
  if (!GEMINI_API_KEY || !SERPER_API_KEY) {
    console.error('Missing required: GEMINI_API_KEY, SERPER_API_KEY');
    process.exit(1);
  }

  console.log('⚠️  Threshold reached! Running AI verification...\n');

  const triggerReason = stats.pending_count >= PENDING_THRESHOLD ? 'threshold_reached' : 'age_exceeded';

  // 4. Create verification batch
  const { data: batch, error: batchError } = await supabase
    .from('verification_batches')
    .insert({
      trigger_reason: triggerReason,
      pending_count_at_start: stats.pending_count,
      oldest_correction_days: stats.oldest_days,
      status: 'running',
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error('Failed to create batch:', batchError?.message);
    process.exit(1);
  }

  console.log(`📝 Created batch: ${batch.id}\n`);

  // 5. Get corrections grouped by tool
  const { data: groups, error: groupsError } = await supabase
    .from('corrections_by_tool')
    .select('*')
    .limit(MAX_TOOLS_PER_RUN);

  if (groupsError || !groups || groups.length === 0) {
    console.log('No corrections to verify.');
    await supabase
      .from('verification_batches')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', batch.id);
    process.exit(0);
  }

  console.log(`🔄 Processing ${groups.length} tools...\n`);

  // 6. Initialize Gemini
  const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  let totalTokens = 0;
  let confirmed = 0;
  let rejected = 0;
  let inconclusive = 0;

  // 7. Process each tool
  for (const group of groups as CorrectionGroup[]) {
    console.log(`\n📦 Tool: ${group.tool_name} (${group.correction_count} corrections)`);

    // Fetch full correction details
    const { data: corrections } = await supabase
      .from('corrections')
      .select('id, field_name, correction_text')
      .in('id', group.correction_ids);

    if (!corrections) continue;

    // Group by field and search once per field type
    const byField = new Map<string, typeof corrections>();
    for (const c of corrections) {
      const field = c.field_name || 'other';
      const existing = byField.get(field) || [];
      existing.push(c);
      byField.set(field, existing);
    }

    for (const [fieldName, fieldCorrections] of byField) {
      console.log(`   Field: ${fieldName} (${fieldCorrections.length} items)`);

      // Search once per field type (deduplication win)
      const searchResults = await searchForData(group.tool_name, fieldName);

      if (searchResults.length === 0) {
        console.log(`   ⚠️  No search results found`);
        for (const c of fieldCorrections) {
          await supabase
            .from('corrections')
            .update({
              ai_verified: true,
              ai_verification_result: 'inconclusive',
              ai_verification_notes: 'No search results found to verify.',
              ai_verified_at: new Date().toISOString(),
              verification_batch_id: batch.id,
            })
            .eq('id', c.id);
          inconclusive++;
        }
        continue;
      }

      // Verify each correction
      for (const correction of fieldCorrections) {
        const result = await verifyCorrection(
          gemini,
          group.tool_name,
          fieldName,
          correction.correction_text,
          searchResults
        );

        await supabase
          .from('corrections')
          .update({
            ai_verified: true,
            ai_verification_result: result.result,
            ai_verification_notes: result.notes,
            ai_verified_at: new Date().toISOString(),
            verification_batch_id: batch.id,
          })
          .eq('id', correction.id);

        totalTokens += result.tokensUsed;

        if (result.result === 'confirmed') {
          confirmed++;
          console.log(`   ✅ Confirmed: "${correction.correction_text.slice(0, 50)}..."`);
        } else if (result.result === 'rejected') {
          rejected++;
          console.log(`   ❌ Rejected: "${correction.correction_text.slice(0, 50)}..."`);
        } else {
          inconclusive++;
          console.log(`   ❓ Inconclusive: "${correction.correction_text.slice(0, 50)}..."`);
        }
      }
    }
  }

  // 8. Update batch with results
  await supabase
    .from('verification_batches')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      tools_checked: groups.length,
      corrections_confirmed: confirmed,
      corrections_rejected: rejected,
      corrections_inconclusive: inconclusive,
      tokens_used: totalTokens,
      admin_notified: !!SLACK_WEBHOOK_URL,
      notification_sent_at: SLACK_WEBHOOK_URL ? new Date().toISOString() : null,
    })
    .eq('id', batch.id);

  // 9. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 Verification Summary:');
  console.log(`   Tools checked: ${groups.length}`);
  console.log(`   ✅ Confirmed: ${confirmed}`);
  console.log(`   ❌ Rejected: ${rejected}`);
  console.log(`   ❓ Inconclusive: ${inconclusive}`);
  console.log(`   🎫 Tokens used: ${totalTokens}`);
  console.log('='.repeat(50));

  // 10. Slack notification
  await sendSlackNotification(
    `🔍 Weekly Corrections Audit Complete!\n` +
    `• ${confirmed} confirmed, ${rejected} rejected, ${inconclusive} inconclusive\n` +
    `• ${groups.length} tools checked, ${totalTokens} tokens used`
  );

  console.log('\n✅ Verification complete!');
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
