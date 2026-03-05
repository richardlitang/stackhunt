import { supabase } from '@/lib/supabase';

interface ComparisonInsightRow {
  item_a_slug: string;
  item_b_slug: string;
  verdict: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export function buildToolPageCuratedVerdictRowLimit(alternativeCount: number): number {
  return Math.min(Math.max(alternativeCount * 3, 20), 300);
}

export async function fetchToolPageCuratedVerdicts(
  toolSlug: string,
  alternativeSlugs: string[]
): Promise<Map<string, string>> {
  const verdicts = new Map<string, string>();
  if (alternativeSlugs.length === 0) return verdicts;
  const alternativeSlugSet = new Set(alternativeSlugs);

  // Keep this query bounded but wide enough to survive duplicate historical rows per pair.
  const rowLimit = buildToolPageCuratedVerdictRowLimit(alternativeSlugs.length);

  const [forwardResult, reverseResult] = await Promise.all([
    supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, verdict, updated_at, created_at')
      .eq('item_a_slug', toolSlug)
      .in('item_b_slug', alternativeSlugs)
      .not('verdict', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(rowLimit),
    supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, verdict, updated_at, created_at')
      .eq('item_b_slug', toolSlug)
      .in('item_a_slug', alternativeSlugs)
      .not('verdict', 'is', null)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(rowLimit),
  ]);

  const mergedRows = [
    ...((forwardResult.data as ComparisonInsightRow[] | null) || []),
    ...((reverseResult.data as ComparisonInsightRow[] | null) || []),
  ];

  for (const insight of mergedRows) {
    if (!insight.verdict) continue;
    const alternativeSlug =
      insight.item_a_slug === toolSlug ? insight.item_b_slug : insight.item_a_slug;
    if (!alternativeSlugSet.has(alternativeSlug)) continue;
    if (!verdicts.has(alternativeSlug)) {
      verdicts.set(alternativeSlug, insight.verdict);
    }
  }

  return verdicts;
}
