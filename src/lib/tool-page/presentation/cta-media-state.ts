import { buildToolPageAddToStackProps } from '@/lib/tool-page/presentation/add-to-stack-props';
import { buildToolPageCompareButtonProps } from '@/lib/tool-page/presentation/compare-button-props';
import { buildToolPagePriceVerificationProps } from '@/lib/tool-page/pricing/price-verification-props';
import { buildToolPageVerdictContent } from '@/lib/tool-page/decision/verdict-content';
import { buildToolPageVideoProps } from '@/lib/tool-page/presentation/video-props';
import { buildToolPageVideoState } from '@/lib/tool-page/presentation/video-state';
import { filterPlansForLensWithMeta, type PricingReviewLens } from '@/lib/pricing/plan-lens';

export interface BuildToolPageCtaMediaStateInput {
  tool: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    pricing_type: string | null;
    user_verifications_this_week: number;
    video_id: string | null;
    video_title: string | null;
    category: { slug: string; name: string } | null;
  };
  knowledgeCardPricing: {
    startingPrice: number | null;
    model: string | null;
    plans: unknown;
  };
  renderVerdictSafe: string | null;
  activeReviewLens?: PricingReviewLens;
}

export function buildToolPageCtaMediaState(input: BuildToolPageCtaMediaStateInput): {
  compareButtonProps: ReturnType<typeof buildToolPageCompareButtonProps>;
  addToStackProps: ReturnType<typeof buildToolPageAddToStackProps>;
  priceVerificationProps: ReturnType<typeof buildToolPagePriceVerificationProps>;
  videoState: ReturnType<typeof buildToolPageVideoState>;
  videoProps: ReturnType<typeof buildToolPageVideoProps>;
  verdictContent: ReturnType<typeof buildToolPageVerdictContent>;
} {
  const allPlans = Array.isArray(input.knowledgeCardPricing.plans)
    ? input.knowledgeCardPricing.plans
    : [];
  const { plans: lensFilteredPlans } = filterPlansForLensWithMeta(
    allPlans,
    input.activeReviewLens || 'general'
  );
  const compareButtonProps = buildToolPageCompareButtonProps({
    toolSlug: input.tool.slug,
    toolName: input.tool.name,
    toolLogo: input.tool.logo_url,
    categorySlug: input.tool.category?.slug || null,
    categoryName: input.tool.category?.name || null,
  });
  const addToStackProps = buildToolPageAddToStackProps({
    toolSlug: input.tool.slug,
    toolName: input.tool.name,
    toolLogo: input.tool.logo_url,
    pricingStartingPrice: input.knowledgeCardPricing.startingPrice,
    pricingModel: input.knowledgeCardPricing.model ?? input.tool.pricing_type,
    pricingPlans: lensFilteredPlans,
  });
  const priceVerificationProps = buildToolPagePriceVerificationProps({
    toolId: input.tool.id,
    toolName: input.tool.name,
    currentPrice: input.knowledgeCardPricing.startingPrice,
    pricingType: input.tool.pricing_type,
    verificationCount: input.tool.user_verifications_this_week,
  });
  const videoState = buildToolPageVideoState({
    videoId: input.tool.video_id,
  });
  const videoProps = buildToolPageVideoProps({
    toolName: input.tool.name,
    videoTitle: input.tool.video_title,
  });
  const verdictContent = buildToolPageVerdictContent({
    renderVerdictSafe: input.renderVerdictSafe,
  });

  return {
    compareButtonProps,
    addToStackProps,
    priceVerificationProps,
    videoState,
    videoProps,
    verdictContent,
  };
}
