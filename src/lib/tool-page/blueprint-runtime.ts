import { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/blueprint-contract';
import { buildToolPageBlueprintRuntimeInputFromRouteData } from '@/lib/tool-page/blueprint-runtime-input';
import { enforceToolPageDecisionLayerIntegrity } from '@/lib/tool-page/decision-layer-integrity';

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
