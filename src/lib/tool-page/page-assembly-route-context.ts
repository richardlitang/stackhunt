import { buildToolPagePageAssemblyRouteStateInputFromRouteContext } from '@/lib/tool-page/page-assembly-route-input';
import { buildToolPagePageAssemblyRouteStateFromRouteContext } from '@/lib/tool-page/page-assembly-route-state';

export function buildToolPagePageAssemblyRouteStateFromPageContext(
  input: Parameters<typeof buildToolPagePageAssemblyRouteStateInputFromRouteContext>[0]
): ReturnType<typeof buildToolPagePageAssemblyRouteStateFromRouteContext> {
  return buildToolPagePageAssemblyRouteStateFromRouteContext(
    buildToolPagePageAssemblyRouteStateInputFromRouteContext(input)
  );
}
