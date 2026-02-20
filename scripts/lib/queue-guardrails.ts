export const DEFAULT_PENDING_STATUSES = ['pending', 'claimed', 'processing'];

export function parseQueueCap(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export async function getAvailableSourceSlots(
  supabase: {
    from: (table: string) => {
      select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => {
        eq: (column: string, value: string) => {
          in: (column: string, values: string[]) => Promise<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  },
  source: string,
  cap: number,
  statuses: string[] = DEFAULT_PENDING_STATUSES
): Promise<{ current: number; remaining: number }> {
  const { count, error } = await supabase
    .from('hunt_queue')
    .select('*', { count: 'exact', head: true })
    .eq('source', source)
    .in('status', statuses);

  if (error) {
    throw new Error(`Failed to inspect queue guardrails: ${error.message}`);
  }

  const current = count || 0;
  const remaining = Math.max(0, cap - current);
  return { current, remaining };
}

