import { supabase } from '@/lib/supabase';

interface ComparisonInsightRow {
  item_a_slug: string;
  item_b_slug: string;
  verdict: string | null;
}

export async function fetchToolPageCuratedVerdicts(
  toolSlug: string,
  alternativeSlugs: string[]
): Promise<Map<string, string>> {
  const verdicts = new Map<string, string>();
  if (alternativeSlugs.length === 0) return verdicts;

  const rowLimit = Math.max(alternativeSlugs.length, 1);

  const [forwardResult, reverseResult] = await Promise.all([
    supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, verdict')
      .eq('item_a_slug', toolSlug)
      .in('item_b_slug', alternativeSlugs)
      .not('verdict', 'is', null)
      .limit(rowLimit),
    supabase
      .from('comparison_insights')
      .select('item_a_slug, item_b_slug, verdict')
      .eq('item_b_slug', toolSlug)
      .in('item_a_slug', alternativeSlugs)
      .not('verdict', 'is', null)
      .limit(rowLimit),
  ]);

  const mergedRows = [
    ...((forwardResult.data as ComparisonInsightRow[] | null) || []),
    ...((reverseResult.data as ComparisonInsightRow[] | null) || []),
  ];

  for (const insight of mergedRows) {
    if (!insight.verdict) continue;
    const alternativeSlug = insight.item_a_slug === toolSlug ? insight.item_b_slug : insight.item_a_slug;
    if (!alternativeSlugs.includes(alternativeSlug)) continue;
    if (!verdicts.has(alternativeSlug)) {
      verdicts.set(alternativeSlug, insight.verdict);
    }
  }

  return verdicts;
}
