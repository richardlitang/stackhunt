/**
 * Cron Job: Weekly Corrections Verification
 *
 * Runs weekly (or on-demand) to verify user-submitted corrections using AI.
 *
 * Logic:
 * - If pending corrections >= 50 OR oldest pending > 30 days: Run AI verification
 * - Otherwise: Just send admin summary, skip AI
 *
 * Schedule: Configured in vercel.json (suggested: Sunday 2am UTC)
 * Security: Protected by CRON_SECRET
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { createVerificationService, type CorrectionToVerify } from '@/lib/verification';
import { sendCorrectionsSummary, sendThresholdAlert } from '@/lib/notifications/slack';

export const prerender = false;

// Safety limit: Max tools to verify per run (cost ceiling)
const MAX_TOOLS_PER_RUN = 50;

// Thresholds
const PENDING_THRESHOLD = 50;
const AGE_THRESHOLD_DAYS = 30;

interface VerificationStats {
  pendingCount: number;
  oldestDays: number;
  uniqueTools: number;
  shouldVerify: boolean;
}

export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  const slackWebhookUrl = import.meta.env.SLACK_WEBHOOK_URL;
  const adminUrl =
    import.meta.env.PUBLIC_SITE_URL + '/admin/corrections' ||
    'https://stackhunt.com/admin/corrections';

  try {
    // 1. Get verification stats
    const { data: statsData } = await admin.rpc('get_verification_stats');
    const stats = statsData as VerificationStats;

    // 2. If below thresholds, just send summary and exit
    if (!stats.shouldVerify) {
      // Send summary to Slack if configured
      if (slackWebhookUrl) {
        await sendCorrectionsSummary(
          slackWebhookUrl,
          {
            pendingCount: stats.pendingCount,
            oldestDays: stats.oldestDays,
            uniqueTools: stats.uniqueTools,
            verificationRan: false,
          },
          adminUrl
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'skipped',
          reason: `Below thresholds (pending: ${stats.pendingCount}/${PENDING_THRESHOLD}, oldest: ${stats.oldestDays}/${AGE_THRESHOLD_DAYS} days)`,
          stats,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Thresholds exceeded - run AI verification
    console.log(
      `Running verification: ${stats.pendingCount} pending, oldest ${stats.oldestDays} days`
    );

    // Send threshold alert
    if (slackWebhookUrl) {
      await sendThresholdAlert(slackWebhookUrl, stats.pendingCount, stats.oldestDays, adminUrl);
    }

    // 4. Create verification batch record
    const triggerReason =
      stats.pendingCount >= PENDING_THRESHOLD ? 'threshold_reached' : 'age_exceeded';

    const { data: batch, error: batchError } = await admin
      .from('verification_batches')
      .insert({
        trigger_reason: triggerReason,
        pending_count_at_start: stats.pendingCount,
        oldest_correction_days: stats.oldestDays,
        status: 'running',
      })
      .select()
      .single();

    if (batchError || !batch) {
      throw new Error(`Failed to create batch: ${batchError?.message}`);
    }

    // 5. Get corrections grouped by tool (deduplication)
    const { data: correctionsByTool } = await admin
      .from('corrections_by_tool')
      .select('*')
      .limit(MAX_TOOLS_PER_RUN);

    if (!correctionsByTool || correctionsByTool.length === 0) {
      await admin
        .from('verification_batches')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', batch.id);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'completed',
          reason: 'No corrections to verify',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Initialize verification service
    const verifier = createVerificationService();

    let totalTokens = 0;
    let confirmed = 0;
    let rejected = 0;
    let inconclusive = 0;

    // 7. Process each tool's corrections
    for (const toolGroup of correctionsByTool) {
      const toolCorrections = toolGroup.correction_ids as string[];

      // Fetch full correction details
      const { data: corrections } = await admin
        .from('corrections')
        .select('id, tool_id, field_name, correction_text')
        .in('id', toolCorrections);

      if (!corrections || corrections.length === 0) continue;

      // Map to verification format
      const toVerify: CorrectionToVerify[] = corrections.map((c) => ({
        id: c.id,
        toolId: c.tool_id,
        toolName: toolGroup.tool_name as string,
        toolWebsite: toolGroup.tool_website as string | null,
        fieldName: c.field_name || 'other',
        correctionText: c.correction_text,
      }));

      // Verify all corrections for this tool
      const results = await verifier.verifyToolCorrections(
        toolGroup.tool_name as string,
        toolGroup.tool_website as string | null,
        toVerify
      );

      // 8. Update corrections with results
      for (const result of results) {
        await admin
          .from('corrections')
          .update({
            ai_verified: true,
            ai_verification_result: result.result,
            ai_verification_notes: result.notes,
            ai_verified_at: new Date().toISOString(),
            verification_batch_id: batch.id,
          })
          .eq('id', result.correctionId);

        totalTokens += result.tokensUsed;

        if (result.result === 'confirmed') confirmed++;
        else if (result.result === 'rejected') rejected++;
        else inconclusive++;
      }
    }

    // 9. Update batch with results
    await admin
      .from('verification_batches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        tools_checked: correctionsByTool.length,
        corrections_confirmed: confirmed,
        corrections_rejected: rejected,
        corrections_inconclusive: inconclusive,
        tokens_used: totalTokens,
      })
      .eq('id', batch.id);

    // 10. Send completion summary to Slack
    if (slackWebhookUrl) {
      await sendCorrectionsSummary(
        slackWebhookUrl,
        {
          pendingCount: stats.pendingCount - (confirmed + rejected),
          oldestDays: stats.oldestDays,
          uniqueTools: stats.uniqueTools,
          verificationRan: true,
          confirmedCount: confirmed,
          rejectedCount: rejected,
          inconclusiveCount: inconclusive,
          tokensUsed: totalTokens,
        },
        adminUrl
      );

      await admin
        .from('verification_batches')
        .update({
          admin_notified: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', batch.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: 'verified',
        batchId: batch.id,
        toolsChecked: correctionsByTool.length,
        results: {
          confirmed,
          rejected,
          inconclusive,
        },
        tokensUsed: totalTokens,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Verification cron error:', err);

    // Try to notify via Slack
    if (slackWebhookUrl) {
      await sendCorrectionsSummary(
        slackWebhookUrl,
        {
          pendingCount: 0,
          oldestDays: 0,
          uniqueTools: 0,
          verificationRan: false,
        },
        adminUrl
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
