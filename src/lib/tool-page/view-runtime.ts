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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildToolPageMetaTitle(input: { toolName: string; rawTitle: string }): string {
  const rawTitle = input.rawTitle.trim();
  const genericTitlePattern = new RegExp(
    `^${escapeRegExp(input.toolName)}\\s+Review\\s*\\|\\s*StackHunt$`,
    'i'
  );

  if (!rawTitle || genericTitlePattern.test(rawTitle) || rawTitle.length > 68) {
    return `${input.toolName} Review: Pricing, Tradeoffs, Best Fit | StackHunt`;
  }

  return rawTitle;
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
      title: buildToolPageMetaTitle({
        toolName: input.toolName,
        rawTitle: input.toolMeta.title,
      }),
      ...input.metaRuntimeMeta,
    },
    sourceAriaLabel: (context: string): string =>
      buildToolPageSourceAriaLabel(stripToolPageControlChars(context)),
  };
}
