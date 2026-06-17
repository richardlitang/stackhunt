import { describe, expect, it } from 'vitest';
import { buildHuntTelemetryInsertPayload } from '@/lib/hunter/telemetry-persistence';
import type { HuntTelemetry } from '@/lib/hunter/types';

const sampleTelemetry: HuntTelemetry = {
  tokens: {
    total: 12000,
    research: 4000,
    analysis: 7000,
    other: 1000,
  },
  retries: {
    retries: 3,
    timeoutFailures: 1,
    timeoutFallbackInvocations: 2,
  },
  cost: {
    estimatedUsd: 0.0182,
    usdPerMillionTokens: {
      research: 0.3,
      analysis: 0.6,
      other: 0.6,
    },
  },
};

describe('buildHuntTelemetryInsertPayload', () => {
  it('maps hunt telemetry into the database insert shape', () => {
    expect(
      buildHuntTelemetryInsertPayload({
        toolName: 'Linear',
        contextTitle: 'Best for product teams',
        queueItemId: 'queue-123',
        success: true,
        durationMs: 9876,
        telemetry: sampleTelemetry,
        errorClass: null,
      })
    ).toEqual({
      tool_name: 'Linear',
      context_title: 'Best for product teams',
      queue_item_id: 'queue-123',
      success: true,
      duration_ms: 9876,
      tokens_total: 12000,
      tokens_research: 4000,
      tokens_analysis: 7000,
      retries: 3,
      timeout_failures: 1,
      estimated_cost_usd: 0.0182,
      error_class: null,
    });
  });

  it('falls back to null for optional telemetry fields', () => {
    expect(
      buildHuntTelemetryInsertPayload({
        toolName: 'Linear',
        success: false,
        durationMs: 2500,
        telemetry: undefined,
        errorClass: 'unknown',
      })
    ).toEqual({
      tool_name: 'Linear',
      context_title: null,
      queue_item_id: null,
      success: false,
      duration_ms: 2500,
      tokens_total: null,
      tokens_research: null,
      tokens_analysis: null,
      retries: null,
      timeout_failures: null,
      estimated_cost_usd: null,
      error_class: 'unknown',
    });
  });
});
