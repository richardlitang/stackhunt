import type { buildToolPageContentSectionsState } from '@/lib/tool-page/content-sections-state';

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
  }>;
  effectiveEvidenceCons: Array<{
    text: string;
    sourceUrl: string | null;
    sourceType?: 'official' | 'editorial' | 'community';
    claimType?: 'fact' | 'opinion';
    corroboratingSourceCount?: number;
  }>;
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

interface BuildToolPageContentSectionsStateInputFromRouteContextInput {
  evidenceLinks: BuildToolPageContentSectionsStateInputFromRouteInput['evidenceLinks'];
  lowConfidenceEvidenceLinks: BuildToolPageContentSectionsStateInputFromRouteInput['lowConfidenceEvidenceLinks'];
  effectiveEvidencePros: BuildToolPageContentSectionsStateInputFromRouteInput['effectiveEvidencePros'];
  effectiveEvidenceCons: BuildToolPageContentSectionsStateInputFromRouteInput['effectiveEvidenceCons'];
  knowledgeCard: BuildToolPageContentSectionsStateInputFromRouteInput['knowledgeCard'];
  setupTracks: BuildToolPageContentSectionsStateInputFromRouteInput['setupTracks'];
  gettingStartedCtaUrl: BuildToolPageContentSectionsStateInputFromRouteInput['gettingStartedCtaUrl'];
  prosConsSourcesCount: BuildToolPageContentSectionsStateInputFromRouteInput['prosConsSourcesCount'];
  communityCorroborationCount: BuildToolPageContentSectionsStateInputFromRouteInput['communityCorroborationCount'];
  evidenceBasis: BuildToolPageContentSectionsStateInputFromRouteInput['evidenceBasis'];
  hasCommunity: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['hasCommunity'];
  userAdvocate: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['userAdvocate'];
  guardedHumanVerdict: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['guardedHumanVerdict'];
  vibe: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['vibe'];
  originStory: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['originStory'];
  idealFor: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['idealFor'];
  guardedAvoidIf: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['guardedAvoidIf'];
  powerTip: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['powerTip'];
  delighters: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['delighters'];
  frustrations: BuildToolPageContentSectionsStateInputFromRouteInput['tribalKnowledge']['frustrations'];
  displayCategorySpecificData: BuildToolPageContentSectionsStateInputFromRouteInput['displayCategorySpecificData'];
  vipSpecifics: BuildToolPageContentSectionsStateInputFromRouteInput['vipSpecifics'];
  categoryName: BuildToolPageContentSectionsStateInputFromRouteInput['categoryName'];
  specsVerifiedLabel: BuildToolPageContentSectionsStateInputFromRouteInput['specsVerifiedLabel'];
  pricingCheckedLabel: BuildToolPageContentSectionsStateInputFromRouteInput['pricingCheckedLabel'];
  hasOfficialPricingSource: BuildToolPageContentSectionsStateInputFromRouteInput['hasOfficialPricingSource'];
  pricingEvidenceCount: BuildToolPageContentSectionsStateInputFromRouteInput['pricingEvidenceCount'];
  hasSecurity: BuildToolPageContentSectionsStateInputFromRouteInput['hasSecurity'];
  hasPortability: BuildToolPageContentSectionsStateInputFromRouteInput['hasPortability'];
  hasParentTool: BuildToolPageContentSectionsStateInputFromRouteInput['hasParentTool'];
  tool: {
    name: string;
    website: string | null;
    long_description: string | null;
    affiliate_offers:
      | BuildToolPageContentSectionsStateInputFromRouteInput['affiliateOffers']
      | undefined;
  };
}

export function buildToolPageContentSectionsStateInputFromRoute(
  input: BuildToolPageContentSectionsStateInputFromRouteInput
): Parameters<typeof buildToolPageContentSectionsState>[0] {
  return {
    sourceListsInput: {
      evidenceLinks: input.evidenceLinks,
      lowConfidenceEvidenceLinks: input.lowConfidenceEvidenceLinks,
    },
    prosConsInput: {
      pros: input.effectiveEvidencePros,
      cons: input.effectiveEvidenceCons,
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
      hasKnowledgeCard: Boolean(input.knowledgeCard),
      hasParentTool: input.hasParentTool,
      hasSupport: Boolean(input.knowledgeCard?.support),
      hasSecurityData: Boolean(input.knowledgeCard?.security),
      hasPortabilityData: Boolean(input.knowledgeCard?.smp_portability),
    },
  };
}

export function buildToolPageContentSectionsStateInputFromRouteContext(
  input: BuildToolPageContentSectionsStateInputFromRouteContextInput
): Parameters<typeof buildToolPageContentSectionsState>[0] {
  return buildToolPageContentSectionsStateInputFromRoute({
    evidenceLinks: input.evidenceLinks,
    lowConfidenceEvidenceLinks: input.lowConfidenceEvidenceLinks,
    effectiveEvidencePros: input.effectiveEvidencePros,
    effectiveEvidenceCons: input.effectiveEvidenceCons,
    knowledgeCard: input.knowledgeCard,
    fallbackWebsiteUrl: input.tool.website || null,
    setupTracks: input.setupTracks,
    gettingStartedCtaUrl: input.gettingStartedCtaUrl,
    toolName: input.tool.name,
    prosConsSourcesCount: input.prosConsSourcesCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    affiliateOffers: input.tool.affiliate_offers || [],
    evidenceBasis: input.evidenceBasis,
    tribalKnowledge: {
      hasCommunity: input.hasCommunity,
      userAdvocate: input.userAdvocate,
      guardedHumanVerdict: input.guardedHumanVerdict,
      vibe: input.vibe,
      originStory: input.originStory,
      idealFor: input.idealFor,
      guardedAvoidIf: input.guardedAvoidIf,
      powerTip: input.powerTip,
      delighters: input.delighters,
      frustrations: input.frustrations,
    },
    displayCategorySpecificData: input.displayCategorySpecificData,
    vipSpecifics: input.vipSpecifics,
    categoryName: input.categoryName,
    specsVerifiedLabel: input.specsVerifiedLabel,
    longDescription: input.tool.long_description,
    pricingCheckedLabel: input.pricingCheckedLabel,
    hasOfficialPricingSource: input.hasOfficialPricingSource,
    pricingEvidenceCount: input.pricingEvidenceCount,
    hasSecurity: input.hasSecurity,
    hasPortability: input.hasPortability,
    hasParentTool: input.hasParentTool,
  });
}
