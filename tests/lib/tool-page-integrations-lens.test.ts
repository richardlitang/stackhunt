import { rankIntegrationsForLens } from '@/lib/tool-page/integrations-lens';

describe('tool page integrations lens ranking', () => {
  const notable = [
    { name: 'Zapier', type: 'zapier', direction: 'import' },
    { name: 'Salesforce', type: 'native', direction: 'bidirectional' },
    { name: 'Okta', type: 'api', direction: 'bidirectional' },
  ];

  it('prioritizes Zapier for personal lens', () => {
    const ranked = rankIntegrationsForLens(notable, 'personal');
    expect(ranked[0]?.name).toBe('Zapier');
  });

  it('prioritizes sales stack integrations for startup lens', () => {
    const ranked = rankIntegrationsForLens(notable, 'startup');
    expect(ranked[0]?.name).toBe('Salesforce');
  });

  it('prioritizes identity/governance integrations for enterprise lens', () => {
    const ranked = rankIntegrationsForLens(notable, 'enterprise');
    expect(ranked[0]?.name).toBe('Okta');
  });
});

