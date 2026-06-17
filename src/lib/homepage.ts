/**
 * Pure helpers for the homepage decision instrument.
 * Scores are on a 0-100 scale (see avg_score). Color comes from getScoreColor.
 */

export function formatScore(avgScore: number | null | undefined): string | null {
  if (avgScore == null || avgScore <= 0) return null;
  return String(Math.round(avgScore));
}

export function truncateVerdict(verdict: string | null | undefined, max = 80): string {
  const text = (verdict ?? '').trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function resolveDecisionHref(contextSlug: string | null | undefined): string {
  return contextSlug ? `/best/${contextSlug}` : '/best';
}
