import type { buildToolPageChromeState } from '@/lib/tool-page/page-chrome-state';

interface BuildToolPageChromeStateInputFromRouteInput {
  toolCategory: { slug: string; name: string } | null;
  hasCollectedSources: boolean;
  evaluationDepth: 'Docs-only' | 'Light hands-on' | 'Deep hands-on';
  collectedSourcesTotal: number;
  trustConfidenceLabel: 'High' | 'Medium' | 'Low';
  pendingVerificationCount: number;
  communityCorroborationCount?: number;
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
  pricingVerifiedLabel: string | null;
  trustStatus: 'Source-backed' | 'Needs confirmation';
  website: string | null;
  websiteHostLabel: string | null;
  activeReviewLens: 'general' | 'personal' | 'startup' | 'enterprise';
  lensLabelMap: Record<'general' | 'personal' | 'startup' | 'enterprise', string>;
}

interface BuildToolPageChromeStateInputFromRouteContextInput {
  toolCategory: BuildToolPageChromeStateInputFromRouteInput['toolCategory'];
  hasCollectedSources: BuildToolPageChromeStateInputFromRouteInput['hasCollectedSources'];
  evaluationDepth: BuildToolPageChromeStateInputFromRouteInput['evaluationDepth'];
  collectedSourcesTotal: BuildToolPageChromeStateInputFromRouteInput['collectedSourcesTotal'];
  trustConfidenceLabel: BuildToolPageChromeStateInputFromRouteInput['trustConfidenceLabel'];
  pendingVerificationCount: BuildToolPageChromeStateInputFromRouteInput['pendingVerificationCount'];
  communityCorroborationCount: BuildToolPageChromeStateInputFromRouteInput['communityCorroborationCount'];
  communityVerifiedLabel: BuildToolPageChromeStateInputFromRouteInput['communityVerifiedLabel'];
  specsVerifiedLabel: BuildToolPageChromeStateInputFromRouteInput['specsVerifiedLabel'];
  pricingCheckedLabel: BuildToolPageChromeStateInputFromRouteInput['pricingCheckedLabel'];
  pricingVerifiedLabel: BuildToolPageChromeStateInputFromRouteInput['pricingVerifiedLabel'];
  trustStatus: BuildToolPageChromeStateInputFromRouteInput['trustStatus'];
  activeReviewLens: BuildToolPageChromeStateInputFromRouteInput['activeReviewLens'];
  lensLabelMap: BuildToolPageChromeStateInputFromRouteInput['lensLabelMap'];
  tool: {
    website: string | null;
  };
  websiteHostLabel: string | null;
}

export function buildToolPageChromeStateInputFromRoute(
  input: BuildToolPageChromeStateInputFromRouteInput
): Parameters<typeof buildToolPageChromeState>[0] {
  return {
    toolCategory: input.toolCategory,
    hasCollectedSources: input.hasCollectedSources,
    evaluationDepth: input.evaluationDepth,
    collectedSourcesTotal: input.collectedSourcesTotal,
    trustConfidenceLabel: input.trustConfidenceLabel,
    pendingVerificationCount: input.pendingVerificationCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    trustStatus: input.trustStatus,
    website: input.website,
    websiteHostLabel: input.websiteHostLabel,
    activeReviewLens: input.activeReviewLens,
    lensLabelMap: input.lensLabelMap,
  };
}

export function buildToolPageChromeStateInputFromRouteContext(
  input: BuildToolPageChromeStateInputFromRouteContextInput
): Parameters<typeof buildToolPageChromeState>[0] {
  return buildToolPageChromeStateInputFromRoute({
    toolCategory: input.toolCategory,
    hasCollectedSources: input.hasCollectedSources,
    evaluationDepth: input.evaluationDepth,
    collectedSourcesTotal: input.collectedSourcesTotal,
    trustConfidenceLabel: input.trustConfidenceLabel,
    pendingVerificationCount: input.pendingVerificationCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    trustStatus: input.trustStatus,
    website: input.tool.website || null,
    websiteHostLabel: input.websiteHostLabel,
    activeReviewLens: input.activeReviewLens,
    lensLabelMap: input.lensLabelMap,
  });
}
