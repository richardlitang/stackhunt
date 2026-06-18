import { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/runtime/blueprint-contract';
import { buildToolPageBlueprintRuntimeInputFromRouteData } from '@/lib/tool-page/route-state/blueprint-runtime-input';
import { enforceToolPageDecisionLayerIntegrity } from '@/lib/tool-page/decision/decision-layer-integrity';

type BuildToolPageBlueprintRuntimeFromRouteDataInput = Parameters<
  typeof buildToolPageBlueprintRuntimeInputFromRouteData
>[0];

export function buildToolPageBlueprintRuntimeFromRouteData(
  input: BuildToolPageBlueprintRuntimeFromRouteDataInput
): {
  buyerDecisionLayer: ReturnType<typeof buildToolPageBuyerDecisionLayer>;
} {
  const buyerDecisionLayer = enforceToolPageDecisionLayerIntegrity({
    layer: buildToolPageBuyerDecisionLayer(buildToolPageBlueprintRuntimeInputFromRouteData(input)),
    allowedAlternativeSlugs: input.allowedAlternativeSlugs,
  });

  return { buyerDecisionLayer };
}
