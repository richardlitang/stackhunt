import { buildToolPageSourceAriaLabel } from '@/lib/tool-page/source-labels';
import { stripToolPageControlChars } from '@/lib/tool-page/text';
import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPageViewRuntimeInput {
  toolName: string;
  toolMeta: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
  };
  metaRuntimeMeta: {
    description: string;
    canonical: string;
    noindex: boolean;
  };
}

export interface ToolPageViewRuntime {
  toolReviewHeading: string;
  lensLabelMap: Record<ReviewLens, string>;
  meta: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
    noindex: boolean;
  };
  sourceAriaLabel: (context: string) => string;
}

export function buildToolPageViewRuntime(
  input: BuildToolPageViewRuntimeInput
): ToolPageViewRuntime {
  return {
    toolReviewHeading: `${input.toolName} Review`,
    lensLabelMap: {
      general: 'General',
      personal: 'Solo / Freelancer',
      startup: 'Startup',
      enterprise: 'Enterprise',
    },
    meta: {
      ...input.toolMeta,
      ...input.metaRuntimeMeta,
    },
    sourceAriaLabel: (context: string): string =>
      buildToolPageSourceAriaLabel(stripToolPageControlChars(context)),
  };
}
