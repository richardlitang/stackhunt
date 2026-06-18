import type { BuildToolPageCtaMediaStateInput } from '@/lib/tool-page/presentation/cta-media-state';
import type { PricingReviewLens } from '@/lib/pricing/plan-lens';

interface BuildToolPageCtaMediaStateInputFromToolInput {
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
  knowledgeCard:
    | {
        pricing?: { starting_price?: number | null } | null;
        smp_pricing?: { model?: string | null; plans?: unknown } | null;
      }
    | null
    | undefined;
  renderVerdictSafe: string | null;
  activeReviewLens?: PricingReviewLens;
}

interface BuildToolPageCtaMediaToolFromRouteToolInput {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  pricing_type: string | null;
  user_verifications_this_week: number;
  video_id: string | null;
  video_title: string | null;
}

export function buildToolPageCtaMediaToolFromRouteTool(
  tool: BuildToolPageCtaMediaToolFromRouteToolInput,
  category: { slug: string; name: string } | null
): BuildToolPageCtaMediaStateInputFromToolInput['tool'] {
  return {
    id: tool.id,
    slug: tool.slug,
    name: tool.name,
    logo_url: tool.logo_url,
    pricing_type: tool.pricing_type,
    user_verifications_this_week: tool.user_verifications_this_week,
    video_id: tool.video_id,
    video_title: tool.video_title,
    category,
  };
}

export function buildToolPageCtaMediaStateInputFromTool(
  input: BuildToolPageCtaMediaStateInputFromToolInput
): BuildToolPageCtaMediaStateInput {
  return {
    tool: {
      id: input.tool.id,
      slug: input.tool.slug,
      name: input.tool.name,
      logo_url: input.tool.logo_url,
      pricing_type: input.tool.pricing_type,
      user_verifications_this_week: input.tool.user_verifications_this_week,
      video_id: input.tool.video_id,
      video_title: input.tool.video_title,
      category: input.tool.category
        ? { slug: input.tool.category.slug, name: input.tool.category.name }
        : null,
    },
    knowledgeCardPricing: {
      startingPrice: input.knowledgeCard?.pricing?.starting_price ?? null,
      model: input.knowledgeCard?.smp_pricing?.model ?? null,
      plans: input.knowledgeCard?.smp_pricing?.plans,
    },
    renderVerdictSafe: input.renderVerdictSafe,
    activeReviewLens: input.activeReviewLens || 'general',
  };
}
