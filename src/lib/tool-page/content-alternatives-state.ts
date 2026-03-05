import { buildToolPageAlternativesPricingStateInputFromRouteContext } from '@/lib/tool-page/alternatives-pricing-input';
import { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import { buildToolPageContentSectionsStateInputFromRouteContext } from '@/lib/tool-page/content-sections-input';
import { buildToolPageContentSectionsState } from '@/lib/tool-page/content-sections-state';

interface BuildToolPageContentAlternativesStateFromRouteContextInput {
  alternativesPricing: Parameters<
    typeof buildToolPageAlternativesPricingStateInputFromRouteContext
  >[0];
  contentSections: Parameters<typeof buildToolPageContentSectionsStateInputFromRouteContext>[0];
}

export function buildToolPageContentAlternativesStateFromRouteContext(
  input: BuildToolPageContentAlternativesStateFromRouteContextInput
): {
  alternativesPricingState: ReturnType<typeof buildToolPageAlternativesPricingState>;
  contentSectionsState: ReturnType<typeof buildToolPageContentSectionsState>;
} {
  const alternativesPricingState = buildToolPageAlternativesPricingState(
    buildToolPageAlternativesPricingStateInputFromRouteContext(input.alternativesPricing)
  );
  const contentSectionsState = buildToolPageContentSectionsState(
    buildToolPageContentSectionsStateInputFromRouteContext(input.contentSections)
  );

  return { alternativesPricingState, contentSectionsState };
}
