import { describe, expect, it } from 'vitest';
import {
  buildHuntCostReport,
  formatHuntCostReport,
  type HuntCostRow,
} from '@/lib/hunter/hunt-cost-report';

describe('hunt cost report', () => {
  it('aggregates cost, token, and failure-class totals', () => {
    const rows: HuntCostRow[] = [
      {
        tool_name: 'Linear',
        success: true,
        duration_ms: 1200,
        tokens_total: 1000,
        estimated_cost_usd: 0.0012,
        error_class: null,
      },
      {
        tool_name: 'Linear',
        success: false,
        duration_ms: 900,
        tokens_total: 500,
        estimated_cost_usd: '0.0007',
        error_class: 'timeout',
      },
      {
        tool_name: 'GitHub',
        success: true,
        duration_ms: 1400,
        tokens_total: 2000,
        estimated_cost_usd: 0.0026,
        error_class: null,
      },
    ];

    const report = buildHuntCostReport(rows, 7);

    expect(report.days).toBe(7);
    expect(report.hunts).toBe(3);
    expect(report.successRate).toBeCloseTo((2 / 3) * 100);
    expect(report.totalCostUsd).toBeCloseTo(0.0045);
    expect(report.totalTokens).toBe(3500);
    expect(report.avgCostPerHuntUsd).toBeCloseTo(0.0015);
    expect(report.topTools).toHaveLength(2);
    expect(report.topTools[0]).toEqual({ toolName: 'GitHub', costUsd: 0.0026 });
    expect(report.topTools[1].toolName).toBe('Linear');
    expect(report.topTools[1].costUsd).toBeCloseTo(0.0019);
    expect(report.failureClasses).toEqual([{ errorClass: 'timeout', count: 1 }]);
  });

  it('formats an empty report without crashing', () => {
    expect(
      formatHuntCostReport({
        days: 3,
        hunts: 0,
        successRate: 0,
        totalCostUsd: 0,
        totalTokens: 0,
        avgCostPerHuntUsd: 0,
        topTools: [],
        failureClasses: [],
      })
    ).toContain('Hunt costs - last 3 day(s)');
  });
});
