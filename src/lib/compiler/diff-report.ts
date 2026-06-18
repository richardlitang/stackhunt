export interface RankedEntry {
  id: string;
  score?: number | null;
}

export interface RankDelta {
  id: string;
  runtimeRank: number | null;
  snapshotRank: number | null;
  delta: number | null;
}

export interface RankingDiffSummary {
  runtimeCount: number;
  snapshotCount: number;
  overlapCount: number;
  overlapRate: number;
  topK: number;
  topKAgreementCount: number;
  topKAgreementRate: number;
  missingInSnapshot: string[];
  missingInRuntime: string[];
  rankDeltas: RankDelta[];
}

export interface WinnerDiffSummary {
  runtimeWinner: string | null;
  snapshotWinner: string | null;
  matches: boolean;
}

export function normalizeRankedEntries(entries: RankedEntry[]): RankedEntry[] {
  const deduped = new Map<string, RankedEntry>();
  for (const entry of entries) {
    const id = String(entry.id || '').trim();
    if (!id || deduped.has(id)) continue;
    deduped.set(id, { id, score: typeof entry.score === 'number' ? entry.score : null });
  }
  return Array.from(deduped.values());
}

export function diffRankings(
  runtimeEntries: RankedEntry[],
  snapshotEntries: RankedEntry[],
  topK = 5
): RankingDiffSummary {
  const runtime = normalizeRankedEntries(runtimeEntries);
  const snapshot = normalizeRankedEntries(snapshotEntries);
  const runtimeIds = runtime.map((entry) => entry.id);
  const snapshotIds = snapshot.map((entry) => entry.id);

  const runtimeRankMap = new Map(runtimeIds.map((id, i) => [id, i + 1]));
  const snapshotRankMap = new Map(snapshotIds.map((id, i) => [id, i + 1]));

  const runtimeSet = new Set(runtimeIds);
  const snapshotSet = new Set(snapshotIds);
  const overlap = runtimeIds.filter((id) => snapshotSet.has(id));

  const missingInSnapshot = runtimeIds.filter((id) => !snapshotSet.has(id));
  const missingInRuntime = snapshotIds.filter((id) => !runtimeSet.has(id));

  const overlapRate = runtimeIds.length === 0 ? 0 : overlap.length / runtimeIds.length;

  const k = Math.max(1, topK);
  const runtimeTopK = new Set(runtimeIds.slice(0, k));
  const snapshotTopK = new Set(snapshotIds.slice(0, k));
  const topKAgreementCount = Array.from(runtimeTopK).filter((id) => snapshotTopK.has(id)).length;
  const topKAgreementRate = runtimeTopK.size === 0 ? 0 : topKAgreementCount / runtimeTopK.size;

  const rankDeltas = overlap
    .map((id) => {
      const runtimeRank = runtimeRankMap.get(id) || null;
      const snapshotRank = snapshotRankMap.get(id) || null;
      return {
        id,
        runtimeRank,
        snapshotRank,
        delta: runtimeRank && snapshotRank ? snapshotRank - runtimeRank : null,
      };
    })
    .sort((a, b) => {
      const absA = Math.abs(a.delta || 0);
      const absB = Math.abs(b.delta || 0);
      return absB - absA;
    });

  return {
    runtimeCount: runtime.length,
    snapshotCount: snapshot.length,
    overlapCount: overlap.length,
    overlapRate,
    topK: k,
    topKAgreementCount,
    topKAgreementRate,
    missingInSnapshot,
    missingInRuntime,
    rankDeltas,
  };
}

export function diffWinner(
  runtimeWinner: string | null | undefined,
  snapshotWinner: string | null | undefined
): WinnerDiffSummary {
  const runtime = runtimeWinner ? String(runtimeWinner) : null;
  const snapshot = snapshotWinner ? String(snapshotWinner) : null;
  return {
    runtimeWinner: runtime,
    snapshotWinner: snapshot,
    matches: runtime !== null && snapshot !== null ? runtime === snapshot : false,
  };
}
