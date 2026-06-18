import { describe, expect, it } from 'vitest';
import { resolveToolPageProductArchetype } from '@/lib/tool-page/policy/product-archetype';

describe('tool page product archetype', () => {
  it('detects api-first devtool archetype', () => {
    const archetype = resolveToolPageProductArchetype({
      categorySlug: 'developer-tools',
      hasApi: true,
      hasParentTool: false,
      hasEnterpriseSignals: false,
    });
    expect(archetype).toBe('api_first_devtool');
  });

  it('detects product family platform when parent tool exists', () => {
    const archetype = resolveToolPageProductArchetype({
      categorySlug: 'ai-automation',
      hasApi: false,
      hasParentTool: true,
      hasEnterpriseSignals: false,
    });
    expect(archetype).toBe('product_family_platform');
  });

  it('defaults to single-surface saas for simple tools', () => {
    const archetype = resolveToolPageProductArchetype({
      categorySlug: 'writing-content',
      hasApi: false,
      hasParentTool: false,
      hasEnterpriseSignals: false,
    });
    expect(archetype).toBe('single_surface_saas');
  });
});
