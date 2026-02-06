/**
 * Constraint evaluation and display helpers
 *
 * Maps constraint consequences to UI severity levels and provides
 * formatting utilities for displaying limits to users.
 */

import type { Constraint, ConstraintConsequence } from '@/lib/knowledge-card';

export type ConstraintSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Evaluate severity based on consequence type
 */
export function evaluateConstraintSeverity(consequence: ConstraintConsequence): ConstraintSeverity {
  const map: Record<ConstraintConsequence, ConstraintSeverity> = {
    data_deletion: 'critical',
    hard_stop: 'critical',
    auto_charge: 'high',
    upgrade_locked: 'medium',
    soft_throttle: 'low',
  };
  return map[consequence];
}

/**
 * Get Tailwind color classes for severity level
 */
export function getSeverityColors(severity: ConstraintSeverity) {
  const map: Record<ConstraintSeverity, { bg: string; border: string; text: string }> = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
    high: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
    medium: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    low: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', text: 'text-zinc-400' },
  };
  return map[severity];
}

/**
 * Get human-readable label for consequence
 */
export function getConsequenceLabel(consequence: ConstraintConsequence): string {
  const map: Record<ConstraintConsequence, string> = {
    hard_stop: 'Service Stops',
    soft_throttle: 'Throttled',
    auto_charge: 'Auto-Charged',
    upgrade_locked: 'Must Upgrade',
    data_deletion: 'Data Deleted',
  };
  return map[consequence];
}

/**
 * Get human-readable label for constraint type
 */
export function getConstraintTypeLabel(type: string): string {
  const map: Record<string, string> = {
    record_count: 'Records',
    storage_gb: 'Storage',
    api_requests_per_month: 'API Requests',
    api_rate_limit_per_sec: 'Rate Limit',
    seat_count: 'Seats',
    project_count: 'Projects',
    active_contacts: 'Contacts',
    message_credits: 'Messages',
  };
  return map[type] || type;
}

/**
 * Format constraint value with appropriate units
 */
export function formatConstraintValue(type: string, value: number): string {
  if (type === 'storage_gb') return `${value} GB`;
  if (type === 'api_rate_limit_per_sec') return `${value}/sec`;
  if (type === 'api_requests_per_month') {
    return value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M/mo`
      : `${(value / 1000).toFixed(0)}k/mo`;
  }
  return value.toLocaleString();
}

/**
 * Group constraints by severity for organized display
 */
export function groupConstraintsBySeverity(
  constraints: Constraint[]
): Map<ConstraintSeverity, Constraint[]> {
  const groups = new Map<ConstraintSeverity, Constraint[]>();
  for (const c of constraints) {
    const sev = evaluateConstraintSeverity(c.consequence);
    groups.set(sev, [...(groups.get(sev) || []), c]);
  }
  return groups;
}

/**
 * Resolve plan_name_match to actual plan_id via fuzzy matching
 *
 * Prevents LLM hallucination issues where it generates different plan names
 * in different extraction steps.
 */
export function resolvePlanId(
  planNameMatch: string | null,
  plans: Array<{ id: string; name: string }>
): string | null {
  if (!planNameMatch || plans.length === 0) return null;

  // Exact match (case-insensitive)
  const exactMatch = plans.find((p) => p.name.toLowerCase() === planNameMatch.toLowerCase());
  if (exactMatch) return exactMatch.id;

  // Fuzzy match (handle "Pro" vs "Professional", "Biz" vs "Business")
  const normalized = planNameMatch.toLowerCase().replace(/[^a-z0-9]/g, '');
  const fuzzyMatch = plans.find((p) => {
    const planNorm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return planNorm.includes(normalized) || normalized.includes(planNorm);
  });
  if (fuzzyMatch) return fuzzyMatch.id;

  // No match - log warning and return null
  console.warn(
    `[Constraints] Could not resolve plan "${planNameMatch}" to plan_id. Available: ${plans.map((p) => p.name).join(', ')}`
  );
  return null;
}
