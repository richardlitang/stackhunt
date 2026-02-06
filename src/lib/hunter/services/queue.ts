/**
 * Queue Service - Hunt queue management
 *
 * Handles atomic claiming, heartbeat monitoring, and queue item lifecycle.
 *
 * @module hunter/services/queue
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { DlqReason } from '../errors';
import type { ResearchOutput, AnalysisOutput } from '../types';

export interface PhaseCheckpoint {
  version: number;  // Optimistic locking to detect concurrent updates
  research?: ResearchOutput;
  analysis?: AnalysisOutput;
}

export interface QueueConfig {
  supabase: SupabaseClient<Database>;
}

export interface QueueItem {
  id: string;
  tool_name: string;
  context_title: string | null;
  category_slug: string | null;
  hunt_type?: string | null;
  priority: number;
  status: string;
  is_discovery_hunt?: boolean;
  context_id?: string | null;
  force_regenerate?: boolean;
  // V5: Research Dossier from Classifier (pre-generated queries + forensic targets)
  research_dossier?: {
    normalized_tool_name: string;
    primary_category: string;
    scout_queries: string[];
    forensic_targets: string[];
    confidence: 'high' | 'medium' | 'low';
    red_flags?: string[];
  } | null;
}

export interface QueueResult {
  success: boolean;
  queueItem?: QueueItem;
  error?: string;
}

export class QueueService {
  private supabase: SupabaseClient<Database>;
  private workerId: string;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private currentQueueId: string | null = null;

  constructor(config: QueueConfig) {
    this.supabase = config.supabase;
    this.workerId = this.generateWorkerId();
  }

  /**
   * Generate a unique worker ID for this queue processor
   */
  private generateWorkerId(): string {
    const hostname = typeof process !== 'undefined' ? (process.env.HOSTNAME || 'local') : 'browser';
    const pid = typeof process !== 'undefined' ? process.pid : Math.random().toString(36).slice(2);
    return `${hostname}-${pid}-${Date.now()}`;
  }

  /**
   * Get the current worker ID
   */
  getWorkerId(): string {
    return this.workerId;
  }

  /**
   * Atomically claim the next item from the queue
   */
  async claimNext(onLog?: (message: string) => void): Promise<QueueResult> {
    const log = onLog || (() => {});
    log(`Claiming next item from queue (worker: ${this.workerId})...`);

    const { data, error } = await this.supabase.rpc('claim_hunt_queue_item', {
      p_worker_id: this.workerId,
    });

    const queueItem = Array.isArray(data) ? data[0] : data;

    if (error || !queueItem) {
      log('No items in queue or error claiming');
      return { success: false, error: 'No items in queue' };
    }

    log(`Claimed queue item: ${queueItem.tool_name} (id: ${queueItem.id})`);
    return { success: true, queueItem: queueItem as QueueItem };
  }

  /**
   * Mark a queue item as processing (started)
   */
  async markStarted(queueId: string, onLog?: (message: string) => void): Promise<void> {
    const log = onLog || (() => {});
    await this.supabase.rpc('start_hunt', { p_queue_id: queueId });
    log(`Queue item marked as processing: ${queueId}`);
  }

  /**
   * Mark a queue item as completed
   */
  async markCompleted(
    queueId: string,
    result: {
      toolId?: string;
      contextId?: string;
      reviewId?: string;
      tokensUsed?: number;
    },
    onLog?: (message: string) => void
  ): Promise<void> {
    const log = onLog || (() => {});
    await this.supabase.rpc('complete_hunt', {
      p_queue_id: queueId,
      p_tool_id: result.toolId || null,
      p_context_id: result.contextId || null,
      p_review_id: result.reviewId || null,
      p_tokens_used: result.tokensUsed || null,
    });
    log(`Queue item completed: ${queueId}`);
  }

  /**
   * Mark a queue item as defunct (skipped)
   */
  async markDefunct(
    queueId: string,
    defunctStatus: {
      isDefunct: boolean;
      confidence: 'high' | 'medium' | 'low';
      shutdownDate?: string;
      reason?: string;
      evidence?: string;
    },
    tokensUsed?: number,
    onLog?: (message: string) => void
  ): Promise<void> {
    const log = onLog || (() => {});
    await this.supabase.rpc('mark_hunt_defunct', {
      p_queue_id: queueId,
      p_defunct_status: defunctStatus as any,
      p_tokens_used: tokensUsed || null,
    });
    log(`Queue item marked defunct: ${queueId}`);
  }

  /**
   * Mark a queue item as failed with DLQ classification
   */
  async markFailed(
    queueId: string,
    error: string,
    errorDetails?: Record<string, unknown>,
    dlqReason?: DlqReason,
    onLog?: (message: string) => void
  ): Promise<void> {
    const log = onLog || (() => {});
    await this.supabase.rpc('fail_hunt', {
      p_queue_id: queueId,
      p_error: error,
      p_error_details: errorDetails || null,
      p_dlq_reason: dlqReason || 'unknown',
    });
    log(`Queue item failed: ${queueId} (reason: ${dlqReason || 'unknown'})`);
  }

  /**
   * Start sending heartbeats for a queue item
   */
  startHeartbeat(queueId: string, onLog?: (message: string) => void): void {
    const log = onLog || (() => {});
    this.currentQueueId = queueId;

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentQueueId) {
        try {
          await this.supabase.rpc('heartbeat_hunt', { p_queue_id: this.currentQueueId });
          log('Heartbeat sent');
        } catch (err) {
          log(`Heartbeat failed: ${(err as Error).message}`);
        }
      }
    }, 30000);
  }

  /**
   * Stop sending heartbeats
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.currentQueueId = null;
  }

  /**
   * Save checkpoint after completing a phase with version locking
   */
  async saveCheckpoint(
    queueId: string,
    phase: 1 | 2 | 3,
    data: Omit<PhaseCheckpoint, 'version'>,
    expectedVersion?: number,
    onLog?: (message: string) => void
  ): Promise<boolean> {
    const log = onLog || (() => {});

    // Get current checkpoint to determine next version
    const current = await this.getCheckpoint(queueId);
    const currentVersion = current?.version ?? 0;

    // If expectedVersion provided, verify no concurrent update occurred
    if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
      log(`⚠️  Checkpoint conflict detected: expected v${expectedVersion}, found v${currentVersion}`);
      return false;  // Conflict - another worker updated checkpoint
    }

    const newVersion = currentVersion + 1;
    const checkpointWithVersion: PhaseCheckpoint = {
      version: newVersion,
      ...data,
    };

    await this.supabase.rpc('save_hunt_checkpoint', {
      p_queue_id: queueId,
      p_phase: phase,
      p_checkpoint: checkpointWithVersion as any,
    });
    log(`Checkpoint saved: phase ${phase}, version ${newVersion}`);
    return true;
  }

  /**
   * Get checkpoint for resuming a hunt
   */
  async getCheckpoint(queueId: string): Promise<PhaseCheckpoint | null> {
    const { data, error } = await this.supabase
      .from('hunt_queue')
      .select('phase_checkpoint, last_completed_phase')
      .eq('id', queueId)
      .single();

    if (error || !data || !data.phase_checkpoint) {
      return null;
    }

    const checkpoint = data.phase_checkpoint as PhaseCheckpoint;

    // Ensure version field exists (backwards compatibility)
    if (checkpoint && !checkpoint.version) {
      checkpoint.version = 0;
    }

    return checkpoint;
  }

  /**
   * Clear checkpoint after successful completion
   */
  async clearCheckpoint(queueId: string, onLog?: (message: string) => void): Promise<void> {
    const log = onLog || (() => {});
    await this.supabase.rpc('clear_hunt_checkpoint', {
      p_queue_id: queueId,
    });
    log(`Checkpoint cleared`);
  }

  /**
   * Clean up resources (should be called when done with queue processing)
   */
  cleanup(): void {
    this.stopHeartbeat();
  }
}
