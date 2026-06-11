import type { HuntTelemetry } from './types';

export interface HuntTelemetryInsertInput {
  toolName: string;
  contextTitle?: string | null;
  queueItemId?: string | null;
  success: boolean;
  durationMs: number;
  telemetry?: HuntTelemetry;
  errorClass?: string | null;
}

export function buildHuntTelemetryInsertPayload(input: HuntTelemetryInsertInput): {
  tool_name: string;
  context_title: string | null;
  queue_item_id: string | null;
  success: boolean;
  duration_ms: number;
  tokens_total: number | null;
  tokens_research: number | null;
  tokens_analysis: number | null;
  retries: number | null;
  timeout_failures: number | null;
  estimated_cost_usd: number | null;
  error_class: string | null;
} {
  return {
    tool_name: input.toolName,
    context_title: input.contextTitle ?? null,
    queue_item_id: input.queueItemId ?? null,
    success: input.success,
    duration_ms: input.durationMs,
    tokens_total: input.telemetry?.tokens.total ?? null,
    tokens_research: input.telemetry?.tokens.research ?? null,
    tokens_analysis: input.telemetry?.tokens.analysis ?? null,
    retries: input.telemetry?.retries.retries ?? null,
    timeout_failures: input.telemetry?.retries.timeoutFailures ?? null,
    estimated_cost_usd: input.telemetry?.cost.estimatedUsd ?? null,
    error_class: input.errorClass ?? null,
  };
}
