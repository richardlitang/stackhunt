import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database.js';

type HuntRow = {
  tool_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  research_completed_at: string | null;
  created_at: string;
};

type ReviewRow = {
  item_id: string;
  updated_at: string;
};

type ItemRow = {
  id: string;
  name: string;
};

export interface FreshnessBasis {
  toolName: string;
  itemId: string | null;
  lastTerminalHuntAt: string | null;
  lastReviewAt: string | null;
  freshnessBasisAt: string | null;
  ageDays: number | null;
  neverHunted: boolean;
  inCooldown: boolean;
  priority: number;
  reason: string;
}

const TERMINAL_QUEUE_STATUSES = new Set(['completed', 'failed', 'research_complete']);

function toMillis(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? null : parsed;
}

function latestDate(a: string | null, b: string | null): string | null {
  const aMs = toMillis(a);
  const bMs = toMillis(b);
  if (aMs === null) return b;
  if (bMs === null) return a;
  return aMs >= bMs ? a : b;
}

function computePriority(
  basisAt: string | null,
  nowMs: number,
  cooldownHours: number
): { priority: number; ageDays: number | null; inCooldown: boolean; reason: string } {
  if (!basisAt) {
    return { priority: 100, ageDays: null, inCooldown: false, reason: 'never_hunted_or_reviewed' };
  }

  const basisMs = toMillis(basisAt);
  if (basisMs === null) {
    return { priority: 50, ageDays: null, inCooldown: false, reason: 'invalid_basis_timestamp' };
  }

  const ageMs = Math.max(0, nowMs - basisMs);
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageHours < cooldownHours) {
    return {
      priority: 5,
      ageDays: Number(ageDays.toFixed(2)),
      inCooldown: true,
      reason: `cooldown_lt_${cooldownHours}h`,
    };
  }

  const priority = Math.min(99, Math.max(50, 50 + Math.floor(ageDays)));
  return {
    priority,
    ageDays: Number(ageDays.toFixed(2)),
    inCooldown: false,
    reason: 'staleness_age_days',
  };
}

export async function buildFreshnessMap(
  supabase: SupabaseClient<Database>,
  toolNames: string[],
  options?: { cooldownHours?: number }
): Promise<Map<string, FreshnessBasis>> {
  const cooldownHours = options?.cooldownHours ?? 24;
  const uniqueNames = Array.from(new Set(toolNames.filter(Boolean)));
  const result = new Map<string, FreshnessBasis>();
  if (uniqueNames.length === 0) return result;

  const nowMs = Date.now();

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('id, name')
    .in('name', uniqueNames);
  if (itemsError) throw new Error(`Failed to load items: ${itemsError.message}`);

  const itemRows = (items || []) as ItemRow[];
  const itemIdByName = new Map(itemRows.map((i) => [i.name, i.id]));

  const { data: queueRows, error: queueError } = await supabase
    .from('hunt_queue')
    .select('tool_name, status, started_at, completed_at, research_completed_at, created_at')
    .in('tool_name', uniqueNames)
    .order('created_at', { ascending: false });
  if (queueError) throw new Error(`Failed to load hunt queue history: ${queueError.message}`);

  const huntsByTool = new Map<string, HuntRow[]>();
  for (const row of (queueRows || []) as HuntRow[]) {
    const list = huntsByTool.get(row.tool_name) || [];
    list.push(row);
    huntsByTool.set(row.tool_name, list);
  }

  const itemIds = itemRows.map((i) => i.id);
  const reviewsByItem = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data: reviewRows, error: reviewError } = await supabase
      .from('reviews')
      .select('item_id, updated_at')
      .in('item_id', itemIds)
      .order('updated_at', { ascending: false });
    if (reviewError) throw new Error(`Failed to load review history: ${reviewError.message}`);

    for (const row of (reviewRows || []) as ReviewRow[]) {
      if (!reviewsByItem.has(row.item_id)) {
        reviewsByItem.set(row.item_id, row.updated_at);
      }
    }
  }

  for (const toolName of uniqueNames) {
    const itemId = itemIdByName.get(toolName) || null;
    const hunts = huntsByTool.get(toolName) || [];
    let lastTerminalHuntAt: string | null = null;
    for (const hunt of hunts) {
      if (!TERMINAL_QUEUE_STATUSES.has(hunt.status)) continue;
      const terminalAt =
        hunt.status === 'research_complete' ? hunt.research_completed_at : hunt.completed_at;
      lastTerminalHuntAt = latestDate(lastTerminalHuntAt, terminalAt || null);
    }

    const lastReviewAt = itemId ? reviewsByItem.get(itemId) || null : null;
    const freshnessBasisAt = latestDate(lastTerminalHuntAt, lastReviewAt);
    const neverHunted = !lastTerminalHuntAt && !lastReviewAt;
    const scored = computePriority(freshnessBasisAt, nowMs, cooldownHours);

    result.set(toolName, {
      toolName,
      itemId,
      lastTerminalHuntAt,
      lastReviewAt,
      freshnessBasisAt,
      ageDays: scored.ageDays,
      neverHunted,
      inCooldown: scored.inCooldown,
      priority: scored.priority,
      reason: scored.reason,
    });
  }

  return result;
}
