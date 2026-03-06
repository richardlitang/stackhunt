import type { KnowledgeCard, ToolConstraints } from '@/lib/knowledge-card';

interface ToolPageCoreStateInput {
  tool: {
    metadata?: unknown;
    specs?: unknown;
    website?: string | null;
    review_context?: unknown;
  };
  hasNewerUnpublishedReview: boolean;
}

interface ToolPageSetupTracks {
  dev?: Array<Record<string, unknown>>;
  non_dev?: Array<Record<string, unknown>>;
}

export interface ToolPageCoreState {
  knowledgeCard: KnowledgeCard | null;
  toolSpecs: Record<string, unknown> | null;
  globalPros: unknown[];
  globalCons: unknown[];
  constraints: ToolConstraints | null;
  canonicalFacts: Record<string, unknown> | undefined;
  setupTracks: ToolPageSetupTracks | undefined;
  categorySpecificData: Record<string, unknown> | undefined;
  canonicalLatestModels: string[];
  displayCategorySpecificData: Record<string, unknown> | undefined;
  websiteHostLabel: string | null;
  vipSpecifics: Record<string, unknown> | undefined;
  reviewContext: Record<string, unknown> | null;
  userReportedPros: Array<Record<string, unknown>>;
  userReportedCons: Array<Record<string, unknown>>;
}

function deriveWebsiteHostLabel(website: string | null | undefined): string | null {
  if (!website) return null;

  try {
    return new URL(website).hostname.replace(/^www\./, '');
  } catch {
    return website.replace(/^https?:\/\//i, '').split('/')[0] || website;
  }
}

export function deriveToolPageCoreState(input: ToolPageCoreStateInput): ToolPageCoreState {
  const knowledgeCard = input.tool.metadata as KnowledgeCard | null;
  const toolSpecs = input.tool.specs as Record<string, unknown> | null;
  const globalPros = Array.isArray(toolSpecs?.pros) ? toolSpecs.pros : [];
  const globalCons = Array.isArray(toolSpecs?.cons) ? toolSpecs.cons : [];
  const constraints = toolSpecs?.constraints as ToolConstraints | null;
  const canonicalFacts = toolSpecs?.canonical as Record<string, unknown> | undefined;
  const setupTracks = canonicalFacts?.setup_tracks as ToolPageSetupTracks | undefined;
  const categorySpecificData = toolSpecs?.categorySpecificData as
    | Record<string, unknown>
    | undefined;
  const canonicalLatestModels = Array.isArray(canonicalFacts?.latest_models_comparison)
    ? canonicalFacts.latest_models_comparison.filter(
        (entry): entry is string => typeof entry === 'string'
      )
    : [];
  const displayCategorySpecificData =
    categorySpecificData && canonicalLatestModels.length > 0
      ? {
          ...categorySpecificData,
          latest_model: canonicalLatestModels[0],
          model_options: canonicalLatestModels,
        }
      : categorySpecificData;
  const websiteHostLabel = deriveWebsiteHostLabel(input.tool.website || null);
  const vipSpecifics = toolSpecs?.specifics as Record<string, unknown> | undefined;
  const userReportedPros = Array.isArray(
    toolSpecs?.user_reported_pros || toolSpecs?.userReportedPros
  )
    ? ((toolSpecs?.user_reported_pros || toolSpecs?.userReportedPros) as Array<
        Record<string, unknown>
      >)
    : [];
  const userReportedCons = Array.isArray(
    toolSpecs?.user_reported_cons || toolSpecs?.userReportedCons
  )
    ? ((toolSpecs?.user_reported_cons || toolSpecs?.userReportedCons) as Array<
        Record<string, unknown>
      >)
    : [];
  const reviewContext = input.hasNewerUnpublishedReview
    ? null
    : (input.tool.review_context as Record<string, unknown> | null);

  return {
    knowledgeCard,
    toolSpecs,
    globalPros,
    globalCons,
    constraints,
    canonicalFacts,
    setupTracks,
    categorySpecificData,
    canonicalLatestModels,
    displayCategorySpecificData,
    websiteHostLabel,
    vipSpecifics,
    reviewContext,
    userReportedPros,
    userReportedCons,
  };
}
