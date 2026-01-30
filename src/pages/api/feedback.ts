/**
 * Feedback API - POST /api/feedback
 * Allows users to submit general feedback about pages
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

// Simple hash function for IP (privacy-preserving)
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { tool_id, tool_name, page_url, feedback_type, feedback_text, reporter_email } = body;

    // Validation
    if (!feedback_text || !feedback_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (feedback_text.length < 10) {
      return new Response(
        JSON.stringify({ error: 'Please provide more detail (minimum 10 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (feedback_text.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Feedback too long (max 1000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate feedback type
    const validTypes = ['outdated_info', 'missing_info', 'incorrect_pricing', 'incorrect_features', 'broken_link', 'suggestion', 'other'];
    if (!validTypes.includes(feedback_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid feedback type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation if provided
    if (reporter_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reporter_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email address' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const admin = getAdminClient();
    const ipHash = clientAddress ? hashIP(clientAddress) : null;

    // Rate limiting: Check recent submissions from same IP
    if (ipHash) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentFeedback } = await admin
        .from('user_feedback')
        .select('id')
        .eq('ip_hash', ipHash)
        .gte('created_at', fiveMinutesAgo);

      if (recentFeedback && recentFeedback.length >= 3) {
        return new Response(
          JSON.stringify({ error: 'Too many submissions. Please wait a few minutes.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert feedback
    const { error: insertError } = await admin
      .from('user_feedback')
      .insert({
        tool_id: tool_id || null,
        tool_name: tool_name || null,
        page_url: page_url || null,
        feedback_type,
        feedback_text: feedback_text.trim(),
        reporter_email: reporter_email || null,
        ip_hash: ipHash,
        status: 'pending',
      });

    if (insertError) {
      console.error('Failed to insert feedback:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit feedback' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if we should trigger a QA review based on feedback volume
    if (tool_id) {
      await checkAndTriggerQA(admin, tool_id, feedback_type);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback submitted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Feedback API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Check feedback volume and trigger QA review if threshold reached
 * Thresholds:
 * - 3+ "incorrect_pricing" -> Queue for price check
 * - 3+ "incorrect_features" -> Queue for feature verification
 * - 5+ "outdated_info" -> Queue for full refresh
 * - 3+ "broken_link" -> Queue for link validation
 */
async function checkAndTriggerQA(admin: any, toolId: string, feedbackType: string) {
  try {
    // Count recent unresolved feedback of this type for this tool (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: feedbackCounts } = await admin
      .from('user_feedback')
      .select('id')
      .eq('tool_id', toolId)
      .eq('feedback_type', feedbackType)
      .eq('status', 'pending')
      .gte('created_at', thirtyDaysAgo);

    const count = feedbackCounts?.length || 0;

    // Define thresholds for triggering QA
    const thresholds: Record<string, { count: number; huntType: string; priority: number }> = {
      incorrect_pricing: { count: 3, huntType: 'price_only', priority: 4 },
      incorrect_features: { count: 3, huntType: 'refresh', priority: 3 },
      outdated_info: { count: 5, huntType: 'refresh', priority: 3 },
      broken_link: { count: 3, huntType: 'refresh', priority: 2 },
      missing_info: { count: 5, huntType: 'refresh', priority: 2 },
    };

    const threshold = thresholds[feedbackType];
    if (!threshold || count < threshold.count) {
      return; // Not enough feedback to trigger QA
    }

    // Check if tool is already queued or recently hunted
    const { data: existingQueue } = await admin
      .from('hunt_queue')
      .select('id, status')
      .eq('item_id', toolId)
      .in('status', ['pending', 'claimed', 'processing'])
      .limit(1);

    if (existingQueue && existingQueue.length > 0) {
      console.log(`Tool ${toolId} already in queue, skipping auto-queue from feedback`);
      return; // Already queued, don't duplicate
    }

    // Queue the tool for QA review
    const { error: queueError } = await admin
      .from('hunt_queue')
      .insert({
        item_id: toolId,
        hunt_type: threshold.huntType,
        priority: threshold.priority,
        source: 'feedback_trigger',
        metadata: {
          trigger_reason: `${count} ${feedbackType} reports`,
          auto_queued: true,
          triggered_at: new Date().toISOString(),
        },
      });

    if (queueError) {
      console.error('Failed to queue tool for QA:', queueError);
    } else {
      console.log(`Auto-queued tool ${toolId} for ${threshold.huntType} due to ${count} ${feedbackType} reports`);

      // Mark all pending feedback of this type as having triggered QA
      await admin
        .from('user_feedback')
        .update({
          triggered_qa_check: true,
          qa_check_queued_at: new Date().toISOString(),
        })
        .eq('tool_id', toolId)
        .eq('feedback_type', feedbackType)
        .eq('status', 'pending');
    }
  } catch (err) {
    console.error('Error in checkAndTriggerQA:', err);
    // Don't throw - feedback submission should still succeed even if QA trigger fails
  }
}
