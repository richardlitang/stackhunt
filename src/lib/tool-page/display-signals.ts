import { formatPricingType } from '@/lib/utils';
import { sanitizeToolPageStructuredClaimMarkdown } from '@/lib/tool-page/text';

interface BuildToolPageDisplaySignalsInput {
  toolPricingType: string | null;
  reviewSummaryMarkdown: string | null;
  toolVerdict: string | null;
  humanVerdict: string | null;
}

export function buildToolPageDisplaySignals(input: BuildToolPageDisplaySignalsInput): {
  pricingTypeLabel: string;
  renderVerdict: string | null;
} {
  return {
    pricingTypeLabel: formatPricingType(input.toolPricingType || 'paid'),
    renderVerdict: sanitizeToolPageStructuredClaimMarkdown(
      input.reviewSummaryMarkdown || input.toolVerdict || input.humanVerdict
    ),
  };
}
