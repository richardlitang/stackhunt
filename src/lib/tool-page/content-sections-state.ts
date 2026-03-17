import { buildToolPageAboutContent } from '@/lib/tool-page/about-content';
import { buildToolPageAffiliateOffersView } from '@/lib/tool-page/affiliate-offers';
import { buildToolPageEvidenceBasisChips } from '@/lib/tool-page/evidence-basis-chips';
import { buildToolPageGettingStartedProps } from '@/lib/tool-page/getting-started-props';
import { buildToolPageOperationalDetailsState } from '@/lib/tool-page/operational-details';
import { buildToolPagePlatformSectionState } from '@/lib/tool-page/platform-section';
import { buildToolPagePricingEvidenceState } from '@/lib/tool-page/pricing-evidence-state';
import { buildToolPagePricingNotice } from '@/lib/tool-page/pricing-notice';
import { buildToolPagePricingSectionState } from '@/lib/tool-page/pricing-section';
import { buildToolPageProsConsView } from '@/lib/tool-page/pros-cons-view';
import { buildToolPageSourceListsView } from '@/lib/tool-page/source-lists';
import { buildToolPageSpecsProps } from '@/lib/tool-page/specs-props';
import { buildToolPageSpecsSectionState } from '@/lib/tool-page/specs-section';
import { buildToolPageStrengthsSubtitle } from '@/lib/tool-page/strengths-subtitle';
import { buildToolPageTribalKnowledgeProps } from '@/lib/tool-page/tribal-knowledge-props';

interface BuildToolPageContentSectionsStateInput {
  sourceListsInput: Parameters<typeof buildToolPageSourceListsView>[0];
  prosConsInput: Parameters<typeof buildToolPageProsConsView>[0];
  gettingStartedInput: Parameters<typeof buildToolPageGettingStartedProps>[0];
  strengthsSubtitleInput: Parameters<typeof buildToolPageStrengthsSubtitle>[0];
  affiliateOffersInput: Parameters<typeof buildToolPageAffiliateOffersView>[0];
  evidenceBasisInput: Parameters<typeof buildToolPageEvidenceBasisChips>[0];
  tribalKnowledgeInput: Parameters<typeof buildToolPageTribalKnowledgeProps>[0];
  platformSectionInput: Parameters<typeof buildToolPagePlatformSectionState>[0];
  specsPropsInput: Parameters<typeof buildToolPageSpecsProps>[0];
  specsSectionInput: Parameters<typeof buildToolPageSpecsSectionState>[0];
  aboutContentInput: Parameters<typeof buildToolPageAboutContent>[0];
  pricingSectionInput: Parameters<typeof buildToolPagePricingSectionState>[0];
  pricingEvidenceInput: Parameters<typeof buildToolPagePricingEvidenceState>[0];
  pricingNoticeInput: Parameters<typeof buildToolPagePricingNotice>[0];
  operationalDetailsInput: Parameters<typeof buildToolPageOperationalDetailsState>[0];
}

export function buildToolPageContentSectionsState(input: BuildToolPageContentSectionsStateInput): {
  sourceListsView: ReturnType<typeof buildToolPageSourceListsView>;
  prosConsView: ReturnType<typeof buildToolPageProsConsView>;
  gettingStartedProps: ReturnType<typeof buildToolPageGettingStartedProps>;
  strengthsSubtitle: string;
  affiliateOffersView: ReturnType<typeof buildToolPageAffiliateOffersView>;
  evidenceBasisChips: ReturnType<typeof buildToolPageEvidenceBasisChips>;
  tribalKnowledgeProps: ReturnType<typeof buildToolPageTribalKnowledgeProps>;
  platformSectionState: ReturnType<typeof buildToolPagePlatformSectionState>;
  specsProps: ReturnType<typeof buildToolPageSpecsProps>;
  specsSectionState: ReturnType<typeof buildToolPageSpecsSectionState>;
  aboutContent: ReturnType<typeof buildToolPageAboutContent>;
  pricingSectionState: ReturnType<typeof buildToolPagePricingSectionState>;
  pricingEvidenceState: ReturnType<typeof buildToolPagePricingEvidenceState>;
  pricingNotice: ReturnType<typeof buildToolPagePricingNotice>;
  operationalDetailsState: ReturnType<typeof buildToolPageOperationalDetailsState>;
} {
  const sourceListsView = buildToolPageSourceListsView(input.sourceListsInput);
  const prosConsView = buildToolPageProsConsView(input.prosConsInput);
  const gettingStartedProps = buildToolPageGettingStartedProps(input.gettingStartedInput);
  const strengthsSubtitle = buildToolPageStrengthsSubtitle(input.strengthsSubtitleInput);
  const affiliateOffersView = buildToolPageAffiliateOffersView(input.affiliateOffersInput);
  const evidenceBasisChips = buildToolPageEvidenceBasisChips(input.evidenceBasisInput);
  const tribalKnowledgeProps = buildToolPageTribalKnowledgeProps(input.tribalKnowledgeInput);
  const platformSectionState = buildToolPagePlatformSectionState(input.platformSectionInput);
  const specsProps = buildToolPageSpecsProps(input.specsPropsInput);
  const specsSectionState = buildToolPageSpecsSectionState(input.specsSectionInput);
  const aboutContent = buildToolPageAboutContent(input.aboutContentInput);
  const pricingSectionState = buildToolPagePricingSectionState(input.pricingSectionInput);
  const pricingEvidenceState = buildToolPagePricingEvidenceState(input.pricingEvidenceInput);
  const pricingNotice = buildToolPagePricingNotice(input.pricingNoticeInput);
  const operationalDetailsState = buildToolPageOperationalDetailsState(
    input.operationalDetailsInput
  );

  return {
    sourceListsView,
    prosConsView,
    gettingStartedProps,
    strengthsSubtitle,
    affiliateOffersView,
    evidenceBasisChips,
    tribalKnowledgeProps,
    platformSectionState,
    specsProps,
    specsSectionState,
    aboutContent,
    pricingSectionState,
    pricingEvidenceState,
    pricingNotice,
    operationalDetailsState,
  };
}
