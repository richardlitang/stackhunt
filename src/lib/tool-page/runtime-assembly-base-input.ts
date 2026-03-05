import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';

interface BuildToolPageRuntimeAssemblyBaseInputFromRouteInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  toolName: string;
  toolVerdict: string | null;
  toolMeta: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
  };
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
}

export function buildToolPageRuntimeAssemblyBaseInputFromRoute(
  input: BuildToolPageRuntimeAssemblyBaseInputFromRouteInput
): Pick<
  {
    pathname: string;
    searchParams: URLSearchParams;
    activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
    toolName: string;
    toolVerdict: string | null;
    toolMeta: {
      title: string;
      description: string;
      canonical: string;
      ogImage?: string;
      ogType?: 'website' | 'article';
    };
    canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  },
  | 'pathname'
  | 'searchParams'
  | 'activeReviewLens'
  | 'toolName'
  | 'toolVerdict'
  | 'toolMeta'
  | 'canonicalHardLimits'
> {
  return {
    pathname: input.pathname,
    searchParams: input.searchParams,
    activeReviewLens: input.activeReviewLens,
    toolName: input.toolName,
    toolVerdict: input.toolVerdict,
    toolMeta: input.toolMeta,
    canonicalHardLimits: input.canonicalHardLimits,
  };
}
