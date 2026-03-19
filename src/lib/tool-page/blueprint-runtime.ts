import { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/blueprint-contract';
import { buildToolPageBlueprintRuntimeInputFromRouteData } from '@/lib/tool-page/blueprint-runtime-input';

type BuildToolPageBlueprintRuntimeFromRouteDataInput = Parameters<
  typeof buildToolPageBlueprintRuntimeInputFromRouteData
>[0];

export function buildToolPageBlueprintRuntimeFromRouteData(
  input: BuildToolPageBlueprintRuntimeFromRouteDataInput
): {
  buyerDecisionLayer: ReturnType<typeof buildToolPageBuyerDecisionLayer>;
} {
  const buyerDecisionLayer = buildToolPageBuyerDecisionLayer(
    buildToolPageBlueprintRuntimeInputFromRouteData(input)
  );

  return { buyerDecisionLayer };
}
