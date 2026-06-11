export interface HuntCostRow {
  tool_name: string;
  success: boolean;
  duration_ms: number | null;
  tokens_total: number | null;
  estimated_cost_usd: number | string | null;
  error_class: string | null;
}

export interface HuntCostToolSpend {
  toolName: string;
  costUsd: number;
}

export interface HuntCostFailureClass {
  errorClass: string;
  count: number;
}

export interface HuntCostReportSummary {
  days: number;
  hunts: number;
  successRate: number;
  totalCostUsd: number;
  totalTokens: number;
  avgCostPerHuntUsd: number;
  topTools: HuntCostToolSpend[];
  failureClasses: HuntCostFailureClass[];
}

function toFiniteNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildHuntCostReport(
  rows: HuntCostRow[],
  days: number,
  topLimit = 5
): HuntCostReportSummary {
  const succeeded = rows.filter((row) => row.success);
  const totalCostUsd = rows.reduce((sum, row) => sum + toFiniteNumber(row.estimated_cost_usd), 0);
  const totalTokens = rows.reduce((sum, row) => sum + toFiniteNumber(row.tokens_total), 0);

  const byTool = new Map<string, number>();
  for (const row of rows) {
    byTool.set(
      row.tool_name,
      (byTool.get(row.tool_name) || 0) + toFiniteNumber(row.estimated_cost_usd)
    );
  }

  const topTools = [...byTool.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLimit)
    .map(([toolName, costUsd]) => ({ toolName, costUsd }));

  const errorClasses = new Map<string, number>();
  for (const row of rows) {
    if (row.success) continue;
    const key = row.error_class || 'unknown';
    errorClasses.set(key, (errorClasses.get(key) || 0) + 1);
  }

  return {
    days,
    hunts: rows.length,
    successRate: rows.length === 0 ? 0 : (succeeded.length / rows.length) * 100,
    totalCostUsd,
    totalTokens,
    avgCostPerHuntUsd: rows.length === 0 ? 0 : totalCostUsd / rows.length,
    topTools,
    failureClasses: [...errorClasses.entries()].map(([errorClass, count]) => ({
      errorClass,
      count,
    })),
  };
}

export function formatHuntCostReport(summary: HuntCostReportSummary): string {
  const lines = [
    `Hunt costs - last ${summary.days} day(s)`,
    `  hunts: ${summary.hunts}  success rate: ${summary.successRate.toFixed(1)}%`,
    `  total est. cost: $${summary.totalCostUsd.toFixed(4)}  total tokens: ${summary.totalTokens}`,
    `  avg cost/hunt: $${summary.avgCostPerHuntUsd.toFixed(4)}`,
    '  most expensive tools:',
  ];

  if (summary.topTools.length === 0) {
    lines.push('    none');
  } else {
    for (const entry of summary.topTools) {
      lines.push(`    ${entry.toolName}: $${entry.costUsd.toFixed(4)}`);
    }
  }

  if (summary.failureClasses.length > 0) {
    lines.push('  failures by class:');
    for (const entry of summary.failureClasses) {
      lines.push(`    ${entry.errorClass}: ${entry.count}`);
    }
  }

  return lines.join('\n');
}
