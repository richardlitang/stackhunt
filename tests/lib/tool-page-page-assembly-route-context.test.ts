import { describe, expect, it, vi } from 'vitest';

const { buildInputMock, buildStateMock } = vi.hoisted(() => ({
  buildInputMock: vi.fn(() => ({ runtime: {}, chrome: {}, decision: {}, navigation: {} })),
  buildStateMock: vi.fn(() => ({ meta: { title: 'Acme review' } })),
}));

vi.mock('@/lib/tool-page/page-assembly-route-input', () => ({
  buildToolPagePageAssemblyRouteStateInputFromRouteContext: buildInputMock,
}));

vi.mock('@/lib/tool-page/page-assembly-route-state', () => ({
  buildToolPagePageAssemblyRouteStateFromRouteContext: buildStateMock,
}));

import { buildToolPagePageAssemblyRouteStateFromPageContext } from '@/lib/tool-page/page-assembly-route-context';

describe('tool page page assembly route context', () => {
  it('composes input builder with route-state builder', () => {
    const result = buildToolPagePageAssemblyRouteStateFromPageContext({} as any);

    expect(buildInputMock).toHaveBeenCalledTimes(1);
    expect(buildStateMock).toHaveBeenCalledTimes(1);
    expect(result.meta.title).toBe('Acme review');
  });
});
