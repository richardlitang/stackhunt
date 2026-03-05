import { buildToolPageCtaMediaState } from '@/lib/tool-page/cta-media-state';
import { buildToolPageCtaMediaStateInputFromRouteContext } from '@/lib/tool-page/cta-media-input';
import { buildToolPageNavigationStateInputFromRouteContext } from '@/lib/tool-page/navigation-input';
import { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';

interface BuildToolPageNavigationMediaStateFromRouteContextInput {
  navigation: Parameters<typeof buildToolPageNavigationStateInputFromRouteContext>[0];
  media: Parameters<typeof buildToolPageCtaMediaStateInputFromRouteContext>[0];
}

export function buildToolPageNavigationMediaStateFromRouteContext(
  input: BuildToolPageNavigationMediaStateFromRouteContextInput
): {
  navigationState: ReturnType<typeof buildToolPageNavigationState>;
  ctaMediaState: ReturnType<typeof buildToolPageCtaMediaState>;
} {
  const navigationState = buildToolPageNavigationState(
    buildToolPageNavigationStateInputFromRouteContext(input.navigation)
  );
  const ctaMediaState = buildToolPageCtaMediaState(
    buildToolPageCtaMediaStateInputFromRouteContext(input.media)
  );

  return { navigationState, ctaMediaState };
}
