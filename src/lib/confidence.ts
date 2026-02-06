/**
 * Content Confidence Scoring System
 *
 * Automatically determines if a page should be noindexed based on data quality.
 * Prevents thin content from harming SEO while allowing high-quality pages to be indexed.
 *
 * @module lib/confidence
 */

import type { Tool, Review } from '@/types/database';

export interface ConfidenceScore {
  score: number; // 0-10 scale
  shouldNoindex: boolean;
  signals: {
    hasShortDescription: boolean;
    hasPricingData: boolean;
    pricingConfidence: 'high' | 'medium' | 'low' | null;
    hasReviewContent: boolean;
    hasSources: boolean;
    sourceCount: number;
    hasKnowledgeCard: boolean;
    hasScore: boolean;
    qaScore: number; // 0-8 scale from QA fields
  };
  reasons: string[];
}

/**
 * Calculate QA score from knowledge card metadata
 * Based on 8 key quality indicators
 */
function calculateQAScore(tool: Tool): number {
  const knowledgeCard = tool.metadata as Record<string, unknown> | null;
  if (!knowledgeCard) return 0;

  let score = 0;

  // 1. Has company info
  const company = knowledgeCard.company as Record<string, unknown> | null;
  if (company?.name) score++;

  // 2. Has features
  const features = knowledgeCard.features as Record<string, unknown> | null;
  const coreFeatures = Array.isArray(features?.core) ? features.core : [];
  if (coreFeatures.length > 0) score++;

  // 3. Has pricing data
  const pricing = knowledgeCard.pricing as Record<string, unknown> | null;
  if (pricing) score++;

  // 4. Has platforms
  const platforms = knowledgeCard.platforms as Record<string, unknown> | null;
  if (platforms?.web || platforms?.mobile || platforms?.desktop) score++;

  // 5. Has integrations
  const integrations = knowledgeCard.integrations as Record<string, unknown> | null;
  if (integrations) score++;

  // 6. Has competitors
  const competitive = knowledgeCard.competitive as Record<string, unknown> | null;
  const competitors = Array.isArray(competitive?.main_alternatives)
    ? competitive.main_alternatives
    : [];
  if (competitors.length > 0) score++;

  // 7. Has audience info
  const audience = knowledgeCard.audience as Record<string, unknown> | null;
  if (audience) score++;

  // 8. Has learning curve
  if (tool.learning_curve) score++;

  return score;
}

/**
 * Evaluate content confidence and determine noindex status
 */
export function evaluateContentConfidence(
  tool: Tool,
  firstReview?: Review | null
): ConfidenceScore {
  const knowledgeCard = tool.metadata as Record<string, unknown> | null;
  const specs = tool.specs as Record<string, unknown> | null;
  const pricingData = specs?.pricing_data as Record<string, unknown> | null;

  // Calculate signals
  const hasShortDescription = !!tool.short_description && tool.short_description.length > 20;
  const hasPricingData = !!pricingData;
  const pricingConfidence = (pricingData?.confidence as 'high' | 'medium' | 'low') || null;
  const hasReviewContent = !!(
    firstReview?.summary_markdown || (firstReview?.pros?.length ?? 0) > 0
  );
  const sourceCount = (firstReview?.sources as unknown[] | undefined)?.length ?? 0;
  const hasSources = sourceCount > 0;
  const hasKnowledgeCard = knowledgeCard && Object.keys(knowledgeCard).length > 5;
  const hasScore = (tool.avg_score ?? 0) > 0;
  const qaScore = calculateQAScore(tool);

  // Calculate confidence score (0-10)
  let score = 0;
  const reasons: string[] = [];

  // Core content (4 points)
  if (hasShortDescription) {
    score += 1;
  } else {
    reasons.push('Missing short description');
  }

  if (hasKnowledgeCard) {
    score += 2;
  } else {
    reasons.push('No knowledge card data');
  }

  if (hasReviewContent) {
    score += 1;
  } else {
    reasons.push('No review content');
  }

  // Data quality (3 points)
  if (hasSources && sourceCount >= 3) {
    score += 1.5;
  } else if (hasSources) {
    score += 0.5;
  } else {
    reasons.push('No source citations');
  }

  if (pricingConfidence === 'high') {
    score += 1;
  } else if (pricingConfidence === 'medium') {
    score += 0.5;
  } else if (pricingConfidence === 'low' || !hasPricingData) {
    reasons.push('Low pricing confidence');
  }

  if (qaScore >= 6) {
    score += 0.5;
  } else if (qaScore < 4) {
    reasons.push(`Low QA score (${qaScore}/8)`);
  }

  // Engagement signals (3 points)
  if (hasScore) {
    score += 1;
  }

  if (tool.review_count > 0) {
    score += 1;
  }

  if (tool.view_count && tool.view_count > 10) {
    score += 1;
  }

  // Noindex decision: only when content is thin AND no review content to anchor claims
  const thinContent = score < 4;
  const missingFoundations = !hasKnowledgeCard && sourceCount === 0;
  const shouldNoindex = thinContent && !hasReviewContent && missingFoundations;

  if (!hasReviewContent) {
    reasons.push('No review content yet');
  }

  if (shouldNoindex && reasons.length === 0) {
    reasons.push(`Low confidence score (${score}/10)`);
  }

  return {
    score,
    shouldNoindex,
    signals: {
      hasShortDescription,
      hasPricingData,
      pricingConfidence,
      hasReviewContent,
      hasSources,
      sourceCount,
      hasKnowledgeCard,
      hasScore,
      qaScore,
    },
    reasons,
  };
}

/**
 * Get human-readable confidence level
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 7) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

/**
 * Generate admin-facing quality report
 */
export function generateQualityReport(confidence: ConfidenceScore): string {
  const level = getConfidenceLevel(confidence.score);
  const emoji = level === 'high' ? '✅' : level === 'medium' ? '⚠️' : '❌';

  let report = `${emoji} Confidence: ${confidence.score.toFixed(1)}/10 (${level})\n`;
  report += `Noindex: ${confidence.shouldNoindex ? 'YES' : 'NO'}\n\n`;

  if (confidence.reasons.length > 0) {
    report += `Issues:\n${confidence.reasons.map((r) => `- ${r}`).join('\n')}\n\n`;
  }

  report += `Signals:\n`;
  report += `- Short description: ${confidence.signals.hasShortDescription ? '✓' : '✗'}\n`;
  report += `- Knowledge card: ${confidence.signals.hasKnowledgeCard ? '✓' : '✗'}\n`;
  report += `- Review content: ${confidence.signals.hasReviewContent ? '✓' : '✗'}\n`;
  report += `- Sources: ${confidence.signals.sourceCount}\n`;
  report += `- Pricing confidence: ${confidence.signals.pricingConfidence || 'none'}\n`;
  report += `- QA score: ${confidence.signals.qaScore}/8\n`;

  return report;
}
