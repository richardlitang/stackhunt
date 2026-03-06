export type ToolPageProductArchetype =
  | 'single_surface_saas'
  | 'product_family_platform'
  | 'api_first_devtool'
  | 'team_enterprise_workflow';

export interface ResolveToolPageProductArchetypeInput {
  categorySlug: string | null;
  hasApi: boolean;
  hasParentTool: boolean;
  hasEnterpriseSignals: boolean;
}

export function resolveToolPageProductArchetype(
  input: ResolveToolPageProductArchetypeInput
): ToolPageProductArchetype {
  const slug = (input.categorySlug || '').toLowerCase();
  const isWorkflow =
    slug.includes('crm') ||
    slug.includes('sales') ||
    slug.includes('project') ||
    slug.includes('collaboration');
  if (input.hasApi && (slug.includes('developer') || slug.includes('api'))) {
    return 'api_first_devtool';
  }
  if (input.hasParentTool) {
    return 'product_family_platform';
  }
  if (input.hasEnterpriseSignals || slug.includes('enterprise')) {
    return 'team_enterprise_workflow';
  }
  if (isWorkflow) {
    return 'team_enterprise_workflow';
  }
  return 'single_surface_saas';
}
