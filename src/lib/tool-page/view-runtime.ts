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

function buildToolPageMetaDescription(input: { toolName: string; rawDescription: string }): string {
  const rawDescription = input.rawDescription.trim().replace(/\s+/g, ' ');
  const isWeakTemplateDescription =
    !rawDescription ||
    rawDescription.length < 80 ||
    /\b(under editorial verification|docs-only snapshot|pending confirmation|review with pricing, fit, and tradeoffs)\b/i.test(
      rawDescription
    );

  if (isWeakTemplateDescription) {
    return `${input.toolName} review with free-plan fit, paid-tier upgrade triggers, rollout risks, and alternatives for real team setups.`;
  }

  if (rawDescription.length > 165) {
    return `${rawDescription.slice(0, 162).trimEnd()}.`;
  }

  return rawDescription;
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
      description: buildToolPageMetaDescription({
        toolName: input.toolName,
        rawDescription: input.metaRuntimeMeta.description || input.toolMeta.description || '',
      }),
    },
    sourceAriaLabel: (context: string): string =>
      buildToolPageSourceAriaLabel(stripToolPageControlChars(context)),
  };
}
