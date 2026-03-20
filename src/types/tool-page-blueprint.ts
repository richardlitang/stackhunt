import type { ReviewLens } from '@/lib/tool-page/view-model';

export type ToolPageBuyerFitStrength = 'weak' | 'mixed' | 'strong';
export type ToolPageImplementationFrictionLevel = 'low' | 'medium' | 'high' | 'unknown';

export interface ToolPageEvidenceMarker {
  evidenceType:
    | 'official_fact'
    | 'official_pricing'
    | 'official_limit'
    | 'hands_on'
    | 'user_signal'
    | 'editorial_inference'
    | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  lastChecked: string | null;
  sourceUrl?: string | null;
}

export interface ToolPageHeroDecisionCard {
  bestFor: string | null;
  notFor: string | null;
  mainRisk: string | null;
  upgradeTrigger: string | null;
  implementationFriction: {
    level: ToolPageImplementationFrictionLevel;
    summary: string | null;
    drivers: string[];
  };
  evidence: ToolPageEvidenceMarker;
}

export interface ToolPageBuyerFitRow {
  fit: ToolPageBuyerFitStrength;
  caveat: string | null;
  reason: string | null;
  evidence: ToolPageEvidenceMarker;
}

export interface ToolPageFitMatrix {
  solo: ToolPageBuyerFitRow | null;
  startup: ToolPageBuyerFitRow | null;
  midMarket: ToolPageBuyerFitRow | null;
  enterprise: ToolPageBuyerFitRow | null;
}

export interface ToolPagePricingReality {
  freeWorksIf: string | null;
  paidNeededWhen: string | null;
  hiddenCostTriggers: string[];
  mainCostDrivers: string[];
  evidence: ToolPageEvidenceMarker;
}

export interface ToolPageBeforeYouBuyTest {
  testType: 'daily_workflow' | 'admin_setup' | 'failure_export';
  name: string;
  whyItMatters: string | null;
  whatToDo: string | null;
  passCondition: string | null;
  commonFailure: string | null;
  evidence: ToolPageEvidenceMarker;
}

export interface ToolPageAlternativesRebuttal {
  slug: string;
  toolName: string;
  chooseInsteadIf: string | null;
  differentiator: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ToolPageCompactTrustStrip {
  status: 'Source-backed' | 'Needs confirmation' | 'Needs recheck';
  confidence: 'High' | 'Medium' | 'Low';
  lastChecked: string | null;
  pendingCount: number;
}

export interface ToolPageDecisionToolbar {
  activeLens: ReviewLens;
  lensHrefs: Record<ReviewLens, string>;
  jumpLinks: Array<{ href: string; label: string }>;
}

export interface ToolPageBuyerDecisionLayer {
  heroDecisionCard: ToolPageHeroDecisionCard;
  fitMatrix: ToolPageFitMatrix;
  pricingReality: ToolPagePricingReality;
  beforeYouBuyTests: ToolPageBeforeYouBuyTest[];
  alternativesRebuttals: ToolPageAlternativesRebuttal[];
  compactTrustStrip: ToolPageCompactTrustStrip;
  toolbar: ToolPageDecisionToolbar;
}
