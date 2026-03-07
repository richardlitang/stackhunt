import type { HunterEntityScope } from '@/lib/hunter/types';

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

export function collectReviewEntityScopes(review: unknown): HunterEntityScope[] {
  const scopes = readReviewSources(review)
    .map((source) => {
      if (!source || typeof source !== 'object') return null;
      const scopeSource = source as ReviewScopeSourceLike;
      return normalizeEntityScope(scopeSource.entity_scope || scopeSource.entityScope);
    })
    .filter((scope): scope is HunterEntityScope => Boolean(scope));

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
