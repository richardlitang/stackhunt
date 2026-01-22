#!/usr/bin/env npx tsx
/**
 * Hunt Queue Worker (Phase 1 MVP)
 *
 * Local worker that processes hunt_queue items in real-time.
 * Features:
 * - Supabase Realtime for instant job pickup
 * - Polling backup (every 60s) for reliability
 * - Atomic job claiming with database-level locking
 * - Retry logic with exponential backoff
 * - Graceful shutdown on Ctrl+C
 * - Rate limiting (5s minimum between jobs)
 *
 * Usage:
 *   npm run hunt:worker
 *   Ctrl+C to stop gracefully
 *
 * @module scripts/hunt-worker
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
config();

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GEMINI_API_KEY || !SERPER_API_KEY) {
  console.error('❌ Missing required: GEMINI_API_KEY, SERPER_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Worker state
const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;
const MIN_JOB_DELAY_MS = 5000; // 5 seconds between jobs (rate limiting)
const POLL_INTERVAL_MS = 60000; // 60 seconds backup polling
const STALE_JOB_RECOVERY_MS = 300000; // 5 minutes

let isProcessing = false;
let currentJobId: string | null = null;
let lastProcessedAt = 0;
let isShuttingDown = false;
let pollTimer: NodeJS.Timeout | null = null;
let statsInterval: NodeJS.Timeout | null = null;

// Stats
let jobsProcessed = 0;
let jobsFailed = 0;
let jobsRetried = 0;

/**
 * Claim next job from queue with atomic locking
 */
async function claimNextJob(): Promise<any | null> {
  const { data, error } = await supabase.rpc('claim_next_hunt_job', {
    p_worker_id: WORKER_ID,
  });

  if (error) {
    console.error('   ⚠️  Failed to claim job:', error.message);
    return null;
  }

  // RPC returns array, get first item
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Mark job as completed
 */
async function completeJob(
  jobId: string,
  toolId: string,
  contextId?: string,
  reviewId?: string
): Promise<void> {
  const { error } = await supabase.rpc('complete_hunt_job', {
    p_job_id: jobId,
    p_tool_id: toolId,
    p_context_id: contextId || null,
    p_review_id: reviewId || null,
  });

  if (error) {
    console.error('   ⚠️  Failed to mark job complete:', error.message);
  }
}

/**
 * Mark job as failed (with retry logic)
 */
async function failJob(
  jobId: string,
  errorMessage: string,
  errorDetails?: any
): Promise<void> {
  const { error } = await supabase.rpc('fail_hunt_job', {
    p_job_id: jobId,
    p_error_message: errorMessage,
    p_error_details: errorDetails ? JSON.stringify(errorDetails) : null,
  });

  if (error) {
    console.error('   ⚠️  Failed to mark job failed:', error.message);
  }
}

/**
 * Process a single job
 */
async function processJob(job: any): Promise<void> {
  const startTime = Date.now();
  currentJobId = job.id;

  console.log(`\n🎯 Processing: ${job.tool_name}`);
  if (job.context_title) console.log(`   Context: ${job.context_title}`);
  if (job.category_slug) console.log(`   Category: ${job.category_slug}`);
  if (job.attempts > 0) console.log(`   Retry attempt: ${job.attempts + 1}`);

  try {
    // Dynamically import Hunter
    const { Hunter } = await import('../src/lib/hunter.js');

    const hunter = new Hunter({
      supabaseUrl: SUPABASE_URL!,
      supabaseServiceKey: SUPABASE_SERVICE_KEY!,
      geminiApiKey: GEMINI_API_KEY!,
      serperApiKey: SERPER_API_KEY!,
      isDraftMode: true, // Always draft from worker
    });

    // Process the hunt
    const result = await hunter.hunt({
      toolName: job.tool_name,
      contextTitle: job.context_title || undefined,
      categorySlug: job.category_slug || undefined,
    });

    if (result.success) {
      await completeJob(
        job.id,
        result.toolId!,
        result.contextId,
        result.reviewId
      );

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Completed in ${duration}s`);
      console.log(`   Tool ID: ${result.toolId}`);
      if (result.reviewId) console.log(`   Review ID: ${result.reviewId}`);
      console.log(`   Tokens: ${result.tokensUsed}`);

      jobsProcessed++;
    } else {
      throw new Error(result.error || 'Hunt failed');
    }
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ Failed after ${duration}s: ${error.message}`);

    await failJob(job.id, error.message, {
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    if (job.attempts < 2) {
      jobsRetried++;
      console.log(`   → Will retry (attempt ${job.attempts + 2}/3)`);
    } else {
      jobsFailed++;
      console.log(`   → Max retries reached, marked as failed`);
    }
  } finally {
    currentJobId = null;
    lastProcessedAt = Date.now();
  }
}

/**
 * Check for pending jobs and process if available
 */
async function checkAndProcess(): Promise<void> {
  if (isProcessing || isShuttingDown) {
    return;
  }

  // Rate limiting: enforce minimum delay between jobs
  const timeSinceLastJob = Date.now() - lastProcessedAt;
  if (lastProcessedAt > 0 && timeSinceLastJob < MIN_JOB_DELAY_MS) {
    const waitTime = MIN_JOB_DELAY_MS - timeSinceLastJob;
    console.log(`   ⏱️  Rate limiting: waiting ${(waitTime / 1000).toFixed(1)}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  isProcessing = true;

  try {
    const job = await claimNextJob();

    if (job) {
      await processJob(job);
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Setup Realtime listener for new jobs
 */
function setupRealtimeListener(): void {
  const channel = supabase
    .channel('hunt_queue_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'hunt_queue',
        filter: 'status=eq.pending',
      },
      (payload) => {
        console.log('📥 New job detected via Realtime');
        checkAndProcess();
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hunt_queue',
        filter: 'status=eq.pending',
      },
      (payload) => {
        console.log('🔄 Job returned to pending (retry)');
        checkAndProcess();
      }
    )
    .on('system', { event: 'disconnect' }, () => {
      console.log('⚠️  Realtime disconnected - polling will continue');
    })
    .on('system', { event: 'connect' }, () => {
      console.log('✅ Realtime connected');
      // Check for pending jobs on reconnect
      checkAndProcess();
    })
    .subscribe();

  console.log('🎧 Realtime listener active');
}

/**
 * Setup backup polling timer
 */
function setupPolling(): void {
  pollTimer = setInterval(async () => {
    if (!isProcessing && !isShuttingDown) {
      console.log('🔍 Polling for pending jobs...');
      await checkAndProcess();
    }
  }, POLL_INTERVAL_MS);

  console.log(`🕐 Backup polling every ${POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Print worker statistics
 */
function printStats(): void {
  const uptime = Math.floor((Date.now() - lastProcessedAt) / 1000);
  console.log(`\n📊 Worker Stats:`);
  console.log(`   Processed: ${jobsProcessed}`);
  console.log(`   Failed: ${jobsFailed}`);
  console.log(`   Retried: ${jobsRetried}`);
  console.log(`   Currently: ${isProcessing ? 'Processing' : 'Idle'}`);
}

/**
 * Setup stats display timer
 */
function setupStatsDisplay(): void {
  statsInterval = setInterval(() => {
    if (!isProcessing) {
      printStats();
    }
  }, 300000); // Every 5 minutes
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`\n\n🛑 Received ${signal}, shutting down gracefully...`);

  // Clear timers
  if (pollTimer) clearInterval(pollTimer);
  if (statsInterval) clearInterval(statsInterval);

  // If processing a job, wait for it to finish
  if (currentJobId && isProcessing) {
    console.log(`⏳ Waiting for current job to finish...`);
    // Wait up to 5 minutes for current job to complete
    const maxWaitTime = 300000; // 5 minutes
    const startWait = Date.now();

    while (isProcessing && Date.now() - startWait < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (isProcessing) {
      console.log(`⚠️  Job did not complete in time, it will be recovered later`);
    } else {
      console.log(`✅ Job completed successfully`);
    }
  }

  printStats();
  console.log('\n👋 Worker stopped\n');
  process.exit(0);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Hunt Queue Worker starting...');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🆔 Worker ID: ${WORKER_ID}\n`);

  // Setup graceful shutdown
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Setup Realtime listener
  setupRealtimeListener();

  // Setup backup polling
  setupPolling();

  // Setup stats display
  setupStatsDisplay();

  // Check for pending jobs immediately
  console.log('🔍 Checking for pending jobs...\n');
  await checkAndProcess();

  console.log('✅ Worker ready - listening for jobs...');
  console.log('   Press Ctrl+C to stop gracefully\n');
}

// Run worker
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
