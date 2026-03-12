import type { HunterEntityScope } from '@/lib/hunter/types';

type SubjectPreflightMode = 'direct_hunt' | 'queue_add';

export interface SubjectPreflightInput {
  toolName: string;
  entityScope?: string | null;
  mode: SubjectPreflightMode;
}

export interface SubjectPreflightResult {
  ok: boolean;
  resolvedScope: HunterEntityScope | null;
  recommendedScopes: HunterEntityScope[];
  requiresExplicitScope: boolean;
  message: string | null;
}

const VALID_SCOPES: HunterEntityScope[] = [
  'core',
  'copilot',
  'actions',
  'enterprise_cloud',
  'enterprise_server',
];

const AMBIGUOUS_PARENT_SCOPE_MAP: Record<string, HunterEntityScope[]> = {
  github: ['core', 'copilot', 'actions', 'enterprise_cloud', 'enterprise_server'],
};

const SCOPE_TOKEN_RULES: Array<{ scope: HunterEntityScope; pattern: RegExp }> = [
  { scope: 'copilot', pattern: /\bcopilot\b/i },
  { scope: 'actions', pattern: /\bactions\b/i },
  { scope: 'enterprise_cloud', pattern: /\benterprise[\s_-]*cloud\b/i },
  { scope: 'enterprise_server', pattern: /\benterprise[\s_-]*server\b|\bghes\b/i },
];

function normalizeScope(input?: string | null): HunterEntityScope | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'ghes') return 'enterprise_server';
  return VALID_SCOPES.includes(normalized as HunterEntityScope)
    ? (normalized as HunterEntityScope)
    : null;
}

function detectAmbiguousParentTool(toolName: string): HunterEntityScope[] {
  const normalized = toolName.trim().toLowerCase();
  return AMBIGUOUS_PARENT_SCOPE_MAP[normalized] || [];
}

function inferScopeFromToolName(toolName: string): HunterEntityScope | null {
  for (const rule of SCOPE_TOKEN_RULES) {
    if (rule.pattern.test(toolName)) return rule.scope;
  }
  return null;
}

export function preflightSubjectResolution(input: SubjectPreflightInput): SubjectPreflightResult {
  const providedScope = normalizeScope(input.entityScope);
  if (input.entityScope && !providedScope) {
    return {
      ok: false,
      resolvedScope: null,
      recommendedScopes: VALID_SCOPES,
      requiresExplicitScope: false,
      message: `Invalid entity scope "${input.entityScope}". Valid scopes: ${VALID_SCOPES.join(', ')}.`,
    };
  }

  if (providedScope) {
    return {
      ok: true,
      resolvedScope: providedScope,
      recommendedScopes: [],
      requiresExplicitScope: false,
      message: null,
    };
  }

  const inferredScope = inferScopeFromToolName(input.toolName);
  if (inferredScope) {
    return {
      ok: true,
      resolvedScope: inferredScope,
      recommendedScopes: [],
      requiresExplicitScope: false,
      message: null,
    };
  }

  const recommendedScopes = detectAmbiguousParentTool(input.toolName);
  if (recommendedScopes.length > 0) {
    return {
      ok: false,
      resolvedScope: null,
      recommendedScopes,
      requiresExplicitScope: true,
      message:
        input.mode === 'queue_add'
          ? `Tool "${input.toolName}" is ambiguous. Provide --entity-scope or use --auto-scope-queue.`
          : `Tool "${input.toolName}" is ambiguous. Run with --entity-scope to resolve one canonical subject.`,
    };
  }

  return {
    ok: true,
    resolvedScope: 'core',
    recommendedScopes: [],
    requiresExplicitScope: false,
    message: null,
  };
}
