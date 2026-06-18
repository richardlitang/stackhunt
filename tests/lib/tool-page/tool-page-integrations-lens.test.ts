import { rankIntegrationsForLens } from '@/lib/tool-page/presentation/integrations-lens';

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

  it('prioritizes integrations explicitly tagged for the active lens', () => {
    const ranked = rankIntegrationsForLens(
      [
        { name: 'Google Sheets', type: 'native', direction: 'import' },
        {
          name: 'Custom ERP Connector',
          type: 'api',
          direction: 'bidirectional',
          works_for_lenses: ['enterprise'] as const,
        },
      ],
      'enterprise'
    );
    expect(ranked[0]?.name).toBe('Custom ERP Connector');
  });
});
