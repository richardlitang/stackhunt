import type { HunterEntityScope } from '../types';

export type EntityScopeAmbiguity = {
  family: string;
  toolName: string;
  recommendedScopes: HunterEntityScope[];
  aliases: string[];
};

export type AutoScopeQueueVariant = {
  toolName: string;
  entityScope?: HunterEntityScope;
  rationale: string;
  popularity: 'high' | 'medium' | 'low';
};

const AMBIGUOUS_FAMILIES: Array<{
  family: string;
  names: string[];
  recommendedScopes: HunterEntityScope[];
  aliases: string[];
}> = [
  {
    family: 'github',
    names: ['github'],
    recommendedScopes: ['core', 'copilot', 'actions', 'enterprise_server'],
    aliases: ['ghes', 'github enterprise server', 'github copilot', 'github actions'],
  },
];

export function detectEntityScopeAmbiguity(
  toolName: string,
  entityScope?: string
): EntityScopeAmbiguity | null {
  if (entityScope) return null;
  const normalized = toolName.trim().toLowerCase();
  const match = AMBIGUOUS_FAMILIES.find((family) => family.names.includes(normalized));
  if (!match) return null;
  return {
    family: match.family,
    toolName,
    recommendedScopes: match.recommendedScopes,
    aliases: match.aliases,
  };
}

export function classifyEntityScopeAttachment(
  toolName: string,
  entityScope?: string
): 'unscoped' | 'attached_to_parent_item' | 'standalone' {
  if (!entityScope) return 'unscoped';
  const normalized = toolName.trim().toLowerCase();
  const isAmbiguousParent = AMBIGUOUS_FAMILIES.some((family) => family.names.includes(normalized));
  return isAmbiguousParent ? 'attached_to_parent_item' : 'standalone';
}

export function buildAutoScopeQueueVariants(
  toolName: string,
  contextTitle?: string
): AutoScopeQueueVariant[] {
  const normalized = toolName.trim().toLowerCase();
  const context = (contextTitle || '').toLowerCase();

  if (normalized === 'github') {
    const variants: AutoScopeQueueVariant[] = [
      {
        toolName: 'GitHub',
        entityScope: 'core',
        rationale: 'Core product page',
        popularity: 'high',
      },
      {
        toolName: 'GitHub',
        entityScope: 'copilot',
        rationale: 'Major sub-product with separate pricing/fit',
        popularity: 'high',
      },
    ];

    const ciSignals = /\b(ci\/cd|cicd|ci cd|pipeline|pipelines|workflow|workflows|runner|runners|devops|automation)\b/.test(
      context
    );
    if (ciSignals) {
      variants.push({
        toolName: 'GitHub',
        entityScope: 'actions',
        rationale: 'CI/CD context signals detected',
        popularity: 'high',
      });
    }

    return variants;
  }

  return [{ toolName, rationale: 'No scoped variants configured', popularity: 'high' }];
}
