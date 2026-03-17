import { describe, expect, it } from 'vitest';
import { findMalformedToolPageRouteCallWrappers } from '@/../scripts/lib/tool-page-route-call-shape-guard.mjs';

describe('tool page route call shape guard', () => {
  it('finds malformed wrapped route helper calls', () => {
    const source = `
const a = buildToolPageDecisionSectionStateFromRoute({
  buildToolPageDecisionSectionStateInputFromRoute({
    foo: 1
  })
});
`;

    const result = findMalformedToolPageRouteCallWrappers(source);
    expect(result).toHaveLength(1);
    expect(result[0].routeHelper).toBe('buildToolPageDecisionSectionStateFromRoute');
    expect(result[0].nestedHelper).toBe('buildToolPageDecisionSectionStateInputFromRoute');
    expect(result[0].line).toBe(2);
  });

  it('does not flag valid direct helper call wiring', () => {
    const source = `
const a = buildToolPageDecisionSectionStateFromRoute(
  buildToolPageDecisionSectionStateInputFromRoute({
    foo: 1
  })
);
`;

    const result = findMalformedToolPageRouteCallWrappers(source);
    expect(result).toHaveLength(0);
  });

  it('ignores malformed-looking patterns inside comments and strings', () => {
    const source = `
// buildToolPageDecisionSectionStateFromRoute({ buildToolPageX(...)
const text = "buildToolPageDecisionSectionStateFromRoute({ buildToolPageX(...)";
/*
buildToolPageDecisionSectionStateFromRoute({
  buildToolPageDecisionSectionStateInputFromRoute({
    foo: 1
  })
});
*/
const real = buildToolPageDecisionSectionStateFromRoute(
  buildToolPageDecisionSectionStateInputFromRoute({
    foo: 1
  })
);
`;

    const result = findMalformedToolPageRouteCallWrappers(source);
    expect(result).toHaveLength(0);
  });
});
