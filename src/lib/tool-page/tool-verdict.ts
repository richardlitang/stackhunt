import { truncateVerdict } from '@/lib/homepage';
import { getScoreColor } from '@/lib/utils';

export interface ToolVerdict {
  score: number | null;
  scoreLabel: string | null;
  recommendationTerm: 'Strong buy' | 'Consider' | 'Weak fit' | 'Avoid' | null;
  scoreColor: ReturnType<typeof getScoreColor> | null;
  verdictLine: string | null;
  lastVerified: string | null;
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

  // Last verified: human-readable date or null
  const lastVerified = lastCheckedISO
    ? new Date(lastCheckedISO).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return { score, scoreLabel, recommendationTerm, scoreColor, verdictLine, lastVerified };
}
