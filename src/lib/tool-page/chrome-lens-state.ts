import { buildToolPageChromeStateInputFromRouteContext } from '@/lib/tool-page/chrome-input';
import { buildToolPageLensViewFields } from '@/lib/tool-page/lens-view-fields';
import { buildToolPageChromeState } from '@/lib/tool-page/page-chrome-state';

interface BuildToolPageChromeLensStateFromRouteContextInput {
  lensRuntime: Parameters<typeof buildToolPageLensViewFields>[0];
  chrome: Parameters<typeof buildToolPageChromeStateInputFromRouteContext>[0];
}

export function buildToolPageChromeLensStateFromRouteContext(
  input: BuildToolPageChromeLensStateFromRouteContextInput
): {
  lensViewFields: ReturnType<typeof buildToolPageLensViewFields>;
  toolChromeState: ReturnType<typeof buildToolPageChromeState>;
} {
  const lensViewFields = buildToolPageLensViewFields(input.lensRuntime);
  const toolChromeState = buildToolPageChromeState(
    buildToolPageChromeStateInputFromRouteContext(input.chrome)
  );
  return { lensViewFields, toolChromeState };
}
