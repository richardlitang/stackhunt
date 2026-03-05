import { buildToolPageRuntimeContext } from '@/lib/tool-page/runtime-context';
import { buildToolPageRuntimeAssemblyInputBundleFromRoute } from '@/lib/tool-page/runtime-assembly-route-input';
import { buildToolPageRuntimeParamsContext } from '@/lib/tool-page/runtime-params-context';
import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';
import { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';

interface BuildToolPageRuntimeAssemblyInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  viewModelInput: BuildToolPageRuntimeParamsInput['lens']['viewModelInput'];
  lensContentInput: BuildToolPageRuntimeParamsInput['lens']['contentInput'];
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  trust: BuildToolPageRuntimeParamsInput['trust'];
  meta: BuildToolPageRuntimeParamsInput['meta'];
  schemas: BuildToolPageRuntimeParamsInput['schemas'];
  updateHistory: BuildToolPageRuntimeParamsInput['updateHistory'];
  runtimeView: {
    toolName: string;
    toolMeta: {
      title: string;
      description: string;
      canonical: string;
      ogImage?: string;
      ogType?: 'website' | 'article';
    };
  };
}

export function buildToolPageRuntimeAssembly(input: BuildToolPageRuntimeAssemblyInput): {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeViewBundle>;
} {
  const runtimeParamsInput = buildToolPageRuntimeParamsContext({
    pathname: input.pathname,
    searchParams: input.searchParams,
    activeReviewLens: input.activeReviewLens,
    viewModelInput: input.viewModelInput,
    lensContentInput: input.lensContentInput,
    canonicalHardLimits: input.canonicalHardLimits,
    trust: input.trust,
    meta: input.meta,
    schemas: input.schemas,
    updateHistory: input.updateHistory,
  });
  const runtime = buildToolPageRuntimeContext({ runtimeParamsInput }).runtime;
  const runtimeViewBundle = buildToolPageRuntimeViewBundle({
    runtime,
    toolName: input.runtimeView.toolName,
    toolMeta: input.runtimeView.toolMeta,
  });

  return { runtimeViewBundle };
}

export function buildToolPageRuntimeAssemblyFromRoute(
  input: Parameters<typeof buildToolPageRuntimeAssemblyInputBundleFromRoute>[0]
): ReturnType<typeof buildToolPageRuntimeAssembly> {
  return buildToolPageRuntimeAssembly(buildToolPageRuntimeAssemblyInputBundleFromRoute(input));
}
