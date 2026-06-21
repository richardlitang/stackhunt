import { truncateVerdict } from '@/lib/homepage';
import { resolveFreshnessLine } from '@/lib/tool-page/freshness-line';
import { getScoreColor } from '@/lib/utils';

export interface ToolVerdict {
  score: number | null;
  scoreLabel: string | null;
  recommendationTerm: 'Strong buy' | 'Consider' | 'Weak fit' | 'Avoid' | null;
  scoreColor: ReturnType<typeof getScoreColor> | null;
  verdictLine: string | null;
  freshnessLine: string | null;
}

export function resolveToolVerdict(input: {
  baseScore: number | null;
  reviewScores: number[];
  verdictText: string | null;
  lastCheckedISO: string | null;
}): ToolVerdict {
  const { baseScore, reviewScores, verdictText, lastCheckedISO } = input;

  // Score resolution: average of reviewScores if any, else baseScore, else null
  let score: number | null = null;
  if (reviewScores.length > 0) {
    const avg = reviewScores.reduce((sum, s) => sum + s, 0) / reviewScores.length;
    score = Math.round(avg);
  } else if (baseScore != null) {
    score = Math.round(baseScore);
  }

  // Score label and color
  const scoreColor = score != null ? getScoreColor(score) : null;
  const scoreLabel = scoreColor ? scoreColor.label : null;
  const recommendationTerm =
    score == null
      ? null
      : score >= 70
        ? 'Strong buy'
        : score >= 50
          ? 'Consider'
          : score >= 30
            ? 'Weak fit'
            : 'Avoid';

  // Verdict line: truncate to 140 chars, return null if empty or no terminal punctuation
  const t = truncateVerdict(verdictText, 140);
  const verdictLine = t && /[.!?]$/.test(t) ? t : null;

  const freshnessLine = resolveFreshnessLine({ lastCheckedISO });

  return { score, scoreLabel, recommendationTerm, scoreColor, verdictLine, freshnessLine };
}
