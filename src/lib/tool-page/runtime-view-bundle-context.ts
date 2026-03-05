import { buildToolPageRuntimeAssembly } from '@/lib/tool-page/runtime-assembly';
import { buildToolPageRuntimeAssemblyInputBundleFromPageContext } from '@/lib/tool-page/runtime-assembly-route-input';
import { buildToolPageRuntimeAssemblySignalsInputFromRouteContext } from '@/lib/tool-page/runtime-assembly-signals-input';

interface BuildToolPageRuntimeViewBundleFromPageContextInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['activeReviewLens'];
  tool: Parameters<typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext>[0]['tool'];
  primaryOffer: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['primaryOffer'];
  faqSchema: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['faqSchema'];
  toolMeta: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['toolMeta'];
  canonicalHardLimits: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['canonicalHardLimits'];
  signals: Parameters<typeof buildToolPageRuntimeAssemblySignalsInputFromRouteContext>[0];
}

export function buildToolPageRuntimeViewBundleFromPageContext(
  input: BuildToolPageRuntimeViewBundleFromPageContextInput
): {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeAssembly>['runtimeViewBundle'];
} {
  const runtimeAssemblySignals = buildToolPageRuntimeAssemblySignalsInputFromRouteContext(
    input.signals
  );
  const { runtimeViewBundle } = buildToolPageRuntimeAssembly(
    buildToolPageRuntimeAssemblyInputBundleFromPageContext({
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
      tool: input.tool,
      primaryOffer: input.primaryOffer,
      faqSchema: input.faqSchema,
      toolMeta: input.toolMeta,
      canonicalHardLimits: input.canonicalHardLimits,
      ...runtimeAssemblySignals,
    })
  );

  return { runtimeViewBundle };
}
