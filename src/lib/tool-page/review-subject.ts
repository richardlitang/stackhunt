import type { HunterEntityScope } from '@/lib/hunter/types';
import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

export type ToolPageReviewSubjectType =
  | 'product'
  | 'product_surface'
  | 'plan_family'
  | 'deployment_mode';

export interface ToolPageResolvedSubject {
  subjectType: ToolPageReviewSubjectType;
  subjectKey: string;
  displayName: string;
  entityScope: HunterEntityScope | null;
  confidence: 'high' | 'medium' | 'low';
  ambiguityReason: string | null;
}

interface ResolveToolPageReviewSubjectInput {
  tool: {
    name: string;
    slug: string;
  };
  parentTool?: {
    name: string;
    slug: string;
  } | null;
}

interface ReviewScopeSourceLike {
  entity_scope?: unknown;
  entityScope?: unknown;
}

function readReviewSources(review: unknown): unknown[] {
  if (!review || typeof review !== 'object') return [];
  const maybeSources = (review as { sources?: unknown }).sources;
  return Array.isArray(maybeSources) ? maybeSources : [];
}

const ENTITY_SCOPE_ALIASES: Array<{
  scope: HunterEntityScope;
  subjectType: ToolPageReviewSubjectType;
  patterns: RegExp[];
}> = [
  {
    scope: 'copilot',
    subjectType: 'product_surface',
    patterns: [/\bcopilot\b/i],
  },
  {
    scope: 'actions',
    subjectType: 'product_surface',
    patterns: [/\bactions\b/i, /\bci\s*\/\s*cd\b/i, /\bworkflows?\b/i],
  },
  {
    scope: 'enterprise_cloud',
    subjectType: 'deployment_mode',
    patterns: [/\benterprise[\s_-]*cloud\b/i],
  },
  {
    scope: 'enterprise_server',
    subjectType: 'deployment_mode',
    patterns: [/\benterprise[\s_-]*server\b/i],
  },
];

const KNOWN_ENTITY_SCOPES = new Set<HunterEntityScope>([
  'core',
  'copilot',
  'actions',
  'enterprise_cloud',
  'enterprise_server',
]);

const ENTITY_SCOPE_SUBJECT_TYPE: Record<HunterEntityScope, ToolPageReviewSubjectType> = {
  core: 'product',
  copilot: 'product_surface',
  actions: 'product_surface',
  enterprise_cloud: 'deployment_mode',
  enterprise_server: 'deployment_mode',
};

function normalizeEntityScope(value: unknown): HunterEntityScope | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return KNOWN_ENTITY_SCOPES.has(normalized as HunterEntityScope)
    ? (normalized as HunterEntityScope)
    : null;
}

function detectSpecificEntityScopes(text: string): Array<{
  scope: HunterEntityScope;
  subjectType: ToolPageReviewSubjectType;
}> {
  const matches: Array<{
    scope: HunterEntityScope;
    subjectType: ToolPageReviewSubjectType;
  }> = [];

  for (const entry of ENTITY_SCOPE_ALIASES) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      matches.push({
        scope: entry.scope,
        subjectType: entry.subjectType,
      });
    }
  }

  return matches;
}

export function resolveToolPageReviewSubject(
  input: ResolveToolPageReviewSubjectInput
): ToolPageResolvedSubject {
  const subjectText = `${input.tool.name} ${input.tool.slug}`.trim();
  const detectedSpecificScopes = detectSpecificEntityScopes(subjectText);

  if (detectedSpecificScopes.length === 1) {
    const match = detectedSpecificScopes[0];
    return {
      subjectType: match.subjectType,
      subjectKey: `${input.tool.slug}:${match.scope}`,
      displayName: input.tool.name,
      entityScope: match.scope,
      confidence: 'high',
      ambiguityReason: null,
    };
  }

  if (/\benterprise\b/i.test(subjectText)) {
    return {
      subjectType: 'plan_family',
      subjectKey: `${input.tool.slug}:enterprise`,
      displayName: input.tool.name,
      entityScope: null,
      confidence: 'low',
      ambiguityReason: 'Enterprise family detected, but deployment mode is unresolved.',
    };
  }

  if (input.parentTool) {
    return {
      subjectType: 'product_surface',
      subjectKey: `${input.tool.slug}:unresolved-surface`,
      displayName: input.tool.name,
      entityScope: null,
      confidence: 'low',
      ambiguityReason: `Child product under ${input.parentTool.name}, but no canonical surface scope was detected.`,
    };
  }

  return {
    subjectType: 'product',
    subjectKey: `${input.tool.slug}:core`,
    displayName: input.tool.name,
    entityScope: 'core',
    confidence: 'high',
    ambiguityReason: null,
  };
}

export function mapLaneSubjectProfileToResolvedSubject(
  laneOutputs: ToolPageLaneOutputs | null,
  tool: { name: string; slug: string }
): ToolPageResolvedSubject | null {
  if (!laneOutputs) return null;
  const profile = laneOutputs.subject_profile;
  if (!profile || typeof profile.subject_key !== 'string') return null;

  let subjectType = profile.subject_type;
  let entityScope = normalizeEntityScope(profile.entity_scope);
  let confidence = profile.confidence;
  let ambiguityReason: string | null = null;

  if (entityScope) {
    const inferredSubjectType = ENTITY_SCOPE_SUBJECT_TYPE[entityScope];
    if (subjectType !== inferredSubjectType) {
      subjectType = inferredSubjectType;
      ambiguityReason =
        'Persisted lane subject type was corrected to match canonical entity scope.';
    }
  } else if (subjectType === 'product') {
    entityScope = 'core';
  } else if (subjectType !== 'plan_family') {
    confidence = 'low';
    ambiguityReason =
      'Persisted lane subject is missing canonical entity scope and needs explicit surface resolution.';
  }

  return {
    subjectType,
    subjectKey: profile.subject_key || `${tool.slug}:core`,
    displayName: profile.display_name || tool.name,
    entityScope,
    confidence,
    ambiguityReason:
      ambiguityReason ||
      (confidence === 'low'
        ? 'Persisted lane subject is low confidence and needs explicit surface resolution.'
        : null),
  };
}

interface ResolveToolPageCanonicalSubjectInput {
  laneSubject: ToolPageResolvedSubject | null;
  heuristicSubject: ToolPageResolvedSubject;
}

export function resolveToolPageCanonicalSubject(
  input: ResolveToolPageCanonicalSubjectInput
): ToolPageResolvedSubject {
  const laneSubject = input.laneSubject;
  if (!laneSubject) return input.heuristicSubject;

  if (laneSubject.confidence === 'high') return laneSubject;

  if (laneSubject.confidence === 'medium') {
    if (laneSubject.entityScope) return laneSubject;
    if (
      input.heuristicSubject.confidence === 'high' &&
      input.heuristicSubject.entityScope &&
      input.heuristicSubject.entityScope !== 'core'
    ) {
      return input.heuristicSubject;
    }
    return laneSubject;
  }

  if (
    input.heuristicSubject.confidence === 'high' &&
    input.heuristicSubject.entityScope &&
    input.heuristicSubject.entityScope !== 'core'
  ) {
    return input.heuristicSubject;
  }
  if (
    input.heuristicSubject.confidence === 'medium' &&
    input.heuristicSubject.entityScope &&
    input.heuristicSubject.entityScope !== 'core'
  ) {
    return input.heuristicSubject;
  }

  return laneSubject;
}

export function collectReviewEntityScopes(review: unknown): HunterEntityScope[] {
  const reviewScope =
    review && typeof review === 'object'
      ? normalizeEntityScope(
          (review as ReviewScopeSourceLike).entity_scope ||
            (review as ReviewScopeSourceLike).entityScope
        )
      : null;
  const sourceScopes = readReviewSources(review)
    .map((source) => {
      if (!source || typeof source !== 'object') return null;
      const scopeSource = source as ReviewScopeSourceLike;
      return normalizeEntityScope(scopeSource.entity_scope || scopeSource.entityScope);
    })
    .filter((scope): scope is HunterEntityScope => Boolean(scope));

  const scopes = reviewScope ? [reviewScope, ...sourceScopes] : sourceScopes;
  return Array.from(new Set(scopes));
}

export function scoreToolPageReviewSubjectMatch(
  review: unknown,
  subject: ToolPageResolvedSubject
): number {
  const scopes = collectReviewEntityScopes(review);

  if (!subject.entityScope) return 0;

  if (subject.entityScope === 'core') {
    if (scopes.length === 0) return 2;
    if (scopes.length === 1 && scopes[0] === 'core') return 4;
    if (scopes.includes('core')) return 1;
    return 0;
  }

  if (scopes.length === 0) return 1;
  if (scopes.length === 1 && scopes[0] === subject.entityScope) return 4;
  if (scopes.includes(subject.entityScope)) return 3;
  return 0;
}

interface ShouldUseSubjectMatchedReviewInput {
  subject: ToolPageResolvedSubject;
  publishedReviewScore: number | null;
}

export function shouldUseSubjectMatchedReview(input: ShouldUseSubjectMatchedReviewInput): boolean {
  if (!input.subject.entityScope) return false;
  if (input.subject.confidence === 'low') return false;
  if (typeof input.publishedReviewScore !== 'number') return false;

  if (input.subject.entityScope === 'core') {
    return input.publishedReviewScore >= 1;
  }

  return input.publishedReviewScore >= 3;
}
