import type { buildToolPageContentSectionsState } from '@/lib/tool-page/route-state/content-sections-state';
import {
  hasCompanyInfoData,
  hasPortabilityData,
  hasSecurityData,
  hasSupportData,
} from '@/lib/tool-page/presentation/knowledge-card-presence';

interface BuildToolPageContentSectionsStateInputFromRouteInput {
  evidenceLinks: Array<{
    url: string;
    title: string;
    domain: string;
    basis: string;
    quality: string;
    inclusionReason: string;
  }>;
  lowConfidenceEvidenceLinks: Array<{
    url: string;
    title: string;
    domain: string;
    basis: string;
    quality: string;
    inclusionReason: string;
  }>;
  effectiveEvidencePros: Array<{
    text: string;
    sourceUrl: string | null;
    sourceType?: 'official' | 'editorial' | 'community';
    claimType?: 'fact' | 'opinion';
    corroboratingSourceCount?: number;
    claimConfidenceTier?: 'high' | 'medium' | 'low';
    claimConfidenceScore?: number;
  }>;
  effectiveEvidenceCons: Array<{
    text: string;
    sourceUrl: string | null;
    sourceType?: 'official' | 'editorial' | 'community';
    claimType?: 'fact' | 'opinion';
    corroboratingSourceCount?: number;
    claimConfidenceTier?: 'high' | 'medium' | 'low';
    claimConfidenceScore?: number;
  }>;
  userReportedPros: Array<Record<string, unknown>>;
  userReportedCons: Array<Record<string, unknown>>;
  laneOutputs?: {
    user_signal_sheet?: {
      user_signal_pros?: Array<Record<string, unknown>>;
      user_signal_cons?: Array<Record<string, unknown>>;
    };
  } | null;
  knowledgeCard:
    | {
        setup_complexity?: string | null;
        integrations?: { has_api?: boolean | null } | null;
        website_url?: string | null;
        platforms?: unknown[] | null;
        support?: unknown;
        security?: unknown;
        smp_portability?: unknown;
      }
    | null
    | undefined;
  fallbackWebsiteUrl: string | null;
  setupTracks: unknown[];
  gettingStartedCtaUrl: string | null;
  toolName: string;
  prosConsSourcesCount: number;
  communityCorroborationCount?: number;
  userSignalClaimsCount?: number;
  affiliateOffers:
    | Array<{ url: string; cta_text: string; is_affiliate?: boolean | null }>
    | null
    | undefined;
  evidenceBasis: Array<{ label: string; count: number }>;
  tribalKnowledge: {
    hasCommunity: boolean;
    userAdvocate: Record<string, unknown> | null;
    guardedHumanVerdict: string | null;
    vibe: string | null;
    originStory: string | null;
    idealFor: string[];
    guardedAvoidIf: string[];
    powerTip: string | null;
    delighters: string[];
    frustrations: string[];
  };
  displayCategorySpecificData: Record<string, unknown> | null;
  vipSpecifics: Record<string, unknown> | null;
  categoryName: string | null;
  specsVerifiedLabel: string | null;
  longDescription: string | null;
  pricingCheckedLabel: string | null;
  hasOfficialPricingSource: boolean;
  pricingEvidenceCount: number;
  hasSecurity: boolean;
  hasPortability: boolean;
  hasParentTool: boolean;
}

function readLaneUserSignalEntries(
  laneOutputs: BuildToolPageContentSectionsStateInputFromRouteInput['laneOutputs']
): {
  pros: Array<Record<string, unknown>>;
  cons: Array<Record<string, unknown>>;
} {
  const userSignalSheet =
    laneOutputs && typeof laneOutputs === 'object'
      ? ((laneOutputs as Record<string, unknown>).user_signal_sheet as Record<string, unknown>)
      : null;
  const lanePros = Array.isArray(userSignalSheet?.user_signal_pros)
    ? (userSignalSheet?.user_signal_pros as Array<Record<string, unknown>>)
    : [];
  const laneCons = Array.isArray(userSignalSheet?.user_signal_cons)
    ? (userSignalSheet?.user_signal_cons as Array<Record<string, unknown>>)
    : [];
  return { pros: lanePros, cons: laneCons };
}

function mergeUniqueEntries(
  primary: Array<Record<string, unknown>>,
  secondary: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const merged: Array<Record<string, unknown>> = [];

  const consume = (entry: Record<string, unknown>) => {
    const text = typeof entry.text === 'string' ? entry.text.trim().toLowerCase() : '';
    const sourceUrl =
      typeof entry.source_url === 'string'
        ? entry.source_url.trim().toLowerCase()
        : typeof entry.sourceUrl === 'string'
          ? entry.sourceUrl.trim().toLowerCase()
          : '';
    const key = `${text}|${sourceUrl}`;
    if (!text || seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  };

  primary.forEach(consume);
  secondary.forEach(consume);
  return merged;
}

export function buildToolPageContentSectionsStateInputFromRoute(
  input: BuildToolPageContentSectionsStateInputFromRouteInput
): Parameters<typeof buildToolPageContentSectionsState>[0] {
  const laneSignals = readLaneUserSignalEntries(input.laneOutputs);
  const mergedUserReportedPros = mergeUniqueEntries(input.userReportedPros || [], laneSignals.pros);
  const mergedUserReportedCons = mergeUniqueEntries(input.userReportedCons || [], laneSignals.cons);

  return {
    sourceListsInput: {
      evidenceLinks: input.evidenceLinks,
      lowConfidenceEvidenceLinks: input.lowConfidenceEvidenceLinks,
    },
    prosConsInput: {
      pros: input.effectiveEvidencePros,
      cons: input.effectiveEvidenceCons,
      userReportedPros: mergedUserReportedPros,
      userReportedCons: mergedUserReportedCons,
    },
    gettingStartedInput: {
      setupComplexity: input.knowledgeCard?.setup_complexity,
      hasApi: Boolean(input.knowledgeCard?.integrations?.has_api),
      websiteUrl: input.knowledgeCard?.website_url || null,
      fallbackWebsiteUrl: input.fallbackWebsiteUrl,
      setupTracks: input.setupTracks,
      setupUrl: input.gettingStartedCtaUrl,
      toolName: input.toolName,
    },
    strengthsSubtitleInput: {
      prosConsSourcesCount: input.prosConsSourcesCount,
      communityCorroborationCount: input.communityCorroborationCount || 0,
      userSignalClaimsCount: input.userSignalClaimsCount || 0,
    },
    affiliateOffersInput: {
      offers: input.affiliateOffers || [],
    },
    evidenceBasisInput: {
      evidenceBasis: input.evidenceBasis,
    },
    tribalKnowledgeInput: {
      hasCommunity: input.tribalKnowledge.hasCommunity,
      userAdvocate: input.tribalKnowledge.userAdvocate,
      guardedHumanVerdict: input.tribalKnowledge.guardedHumanVerdict,
      vibe: input.tribalKnowledge.vibe,
      originStory: input.tribalKnowledge.originStory,
      idealFor: input.tribalKnowledge.idealFor,
      guardedAvoidIf: input.tribalKnowledge.guardedAvoidIf,
      powerTip: input.tribalKnowledge.powerTip,
      delighters: input.tribalKnowledge.delighters,
      frustrations: input.tribalKnowledge.frustrations,
    },
    platformSectionInput: {
      platforms: input.knowledgeCard?.platforms || [],
      integrations: input.knowledgeCard?.integrations || null,
    },
    specsPropsInput: {
      displayCategorySpecificData: input.displayCategorySpecificData,
      vipSpecifics: input.vipSpecifics,
      toolName: input.toolName,
      categoryName: input.categoryName,
    },
    specsSectionInput: {
      specsVerifiedLabel: input.specsVerifiedLabel,
    },
    aboutContentInput: {
      longDescription: input.longDescription,
    },
    pricingSectionInput: {
      pricingCheckedLabel: input.pricingCheckedLabel,
    },
    pricingEvidenceInput: {
      hasOfficialPricingSource: input.hasOfficialPricingSource,
      pricingEvidenceCount: input.pricingEvidenceCount,
    },
    pricingNoticeInput: {
      pricingCheckedLabel: input.pricingCheckedLabel,
    },
    operationalDetailsInput: {
      hasSecurity: input.hasSecurity,
      hasPortability: input.hasPortability,
      hasKnowledgeCard: hasCompanyInfoData(input.knowledgeCard, null),
      hasParentTool: input.hasParentTool,
      hasSupport: hasSupportData(input.knowledgeCard),
      hasSecurityData: hasSecurityData(input.knowledgeCard),
      hasPortabilityData: hasPortabilityData(input.knowledgeCard),
    },
  };
}
