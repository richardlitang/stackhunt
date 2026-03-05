import { buildToolPageNavigationMediaStateFromDecisionContext } from '@/lib/tool-page/navigation-media-decision-context';
import { buildToolPageRuntimeViewBundleFromDecisionContext } from '@/lib/tool-page/runtime-view-bundle-decision-context';

interface BuildToolPageRuntimeNavigationStateFromDecisionContextInput {
  runtime: Parameters<typeof buildToolPageRuntimeViewBundleFromDecisionContext>[0];
  navigation: Omit<
    Parameters<typeof buildToolPageNavigationMediaStateFromDecisionContext>[0],
    'updateHistoryEntries'
  >;
}

export function buildToolPageRuntimeNavigationStateFromDecisionContext(
  input: BuildToolPageRuntimeNavigationStateFromDecisionContextInput
): {
  runtimeViewBundle: ReturnType<
    typeof buildToolPageRuntimeViewBundleFromDecisionContext
  >['runtimeViewBundle'];
  navigationState: ReturnType<
    typeof buildToolPageNavigationMediaStateFromDecisionContext
  >['navigationState'];
  ctaMediaState: ReturnType<
    typeof buildToolPageNavigationMediaStateFromDecisionContext
  >['ctaMediaState'];
} {
  const { runtimeViewBundle } = buildToolPageRuntimeViewBundleFromDecisionContext(input.runtime);
  const { navigationState, ctaMediaState } = buildToolPageNavigationMediaStateFromDecisionContext({
    ...input.navigation,
    updateHistoryEntries: runtimeViewBundle.updateHistoryEntries,
  });

  return { runtimeViewBundle, navigationState, ctaMediaState };
}
