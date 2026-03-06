import { rankConstraintsForLens } from '@/lib/tool-page/constraints-lens';

describe('tool page constraints lens ranking', () => {
  const constraints = [
    { text: 'Free plan capped at 3 seats.' },
    { text: 'SSO and SCIM only on enterprise plan.' },
    { text: 'API automation limit of 10,000 actions per month.' },
  ];

  it('prioritizes seat and free-tier constraints for personal lens', () => {
    const ranked = rankConstraintsForLens(constraints, 'personal');
    expect(ranked[0]?.text).toContain('3 seats');
  });

  it('prioritizes automation and usage constraints for startup lens', () => {
    const ranked = rankConstraintsForLens(constraints, 'startup');
    expect(ranked[0]?.text).toContain('automation');
  });

  it('prioritizes enterprise governance constraints for enterprise lens', () => {
    const ranked = rankConstraintsForLens(constraints, 'enterprise');
    expect(ranked[0]?.text).toContain('SSO and SCIM');
  });
});

