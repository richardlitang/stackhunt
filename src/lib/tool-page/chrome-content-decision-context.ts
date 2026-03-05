import { buildToolPageChromeLensStateFromDecisionContext } from '@/lib/tool-page/chrome-lens-decision-context';
import { buildToolPageContentAlternativesStateFromDecisionContext } from '@/lib/tool-page/content-alternatives-decision-context';

interface BuildToolPageChromeContentStateFromDecisionContextInput {
  chromeLens: Parameters<typeof buildToolPageChromeLensStateFromDecisionContext>[0];
  contentAlternatives: Parameters<
    typeof buildToolPageContentAlternativesStateFromDecisionContext
  >[0];
}

export function buildToolPageChromeContentStateFromDecisionContext(
  input: BuildToolPageChromeContentStateFromDecisionContextInput
): {
  lensViewFields: ReturnType<
    typeof buildToolPageChromeLensStateFromDecisionContext
  >['lensViewFields'];
  toolChromeState: ReturnType<
    typeof buildToolPageChromeLensStateFromDecisionContext
  >['toolChromeState'];
  alternativesPricingState: ReturnType<
    typeof buildToolPageContentAlternativesStateFromDecisionContext
  >['alternativesPricingState'];
  contentSectionsState: ReturnType<
    typeof buildToolPageContentAlternativesStateFromDecisionContext
  >['contentSectionsState'];
} {
  const { lensViewFields, toolChromeState } = buildToolPageChromeLensStateFromDecisionContext(
    input.chromeLens
  );
  const { alternativesPricingState, contentSectionsState } =
    buildToolPageContentAlternativesStateFromDecisionContext(input.contentAlternatives);

  return {
    lensViewFields,
    toolChromeState,
    alternativesPricingState,
    contentSectionsState,
  };
}
