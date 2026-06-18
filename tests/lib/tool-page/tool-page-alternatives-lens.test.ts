import { rankAlternativesForLens } from '@/lib/tool-page/alternatives/alternatives-lens';

describe('tool page alternatives lens ranking', () => {
  const alternatives = [
    {
      slug: 'free-tool',
      pricing_type: 'freemium',
      metadata: { target_market: 'consumer' },
      specs: {
        pricing_data: { plans: [{ target_audience: 'individual' }] },
      },
    },
    {
      slug: 'team-tool',
      pricing_type: 'paid',
      metadata: { target_market: 'business' },
      specs: {
        pricing_data: { plans: [{ target_audience: 'team' }] },
      },
    },
    {
      slug: 'enterprise-tool',
      pricing_type: 'enterprise',
      metadata: { target_market: 'enterprise' },
      specs: {
        pricing_data: { plans: [{ target_audience: 'enterprise' }] },
      },
    },
  ];

  it('prioritizes consumer-friendly alternatives for personal lens', () => {
    const ranked = rankAlternativesForLens(alternatives, 'personal');
    expect(ranked[0]?.slug).toBe('free-tool');
  });

  it('prioritizes team/business alternatives for startup lens', () => {
    const ranked = rankAlternativesForLens(alternatives, 'startup');
    expect(ranked[0]?.slug).toBe('team-tool');
  });

  it('prioritizes enterprise alternatives for enterprise lens', () => {
    const ranked = rankAlternativesForLens(alternatives, 'enterprise');
    expect(ranked[0]?.slug).toBe('enterprise-tool');
  });

  it('uses pricing plan lens tags when present', () => {
    const ranked = rankAlternativesForLens(
      [
        {
          slug: 'team-tool',
          pricing_type: 'paid',
          metadata: { target_market: 'business' },
          specs: {
            pricing_data: {
              plans: [{ target_audience: 'team', works_for_lenses: ['startup'] }],
            },
          },
        },
        {
          slug: 'free-tool',
          pricing_type: 'freemium',
          metadata: { target_market: 'consumer' },
          specs: {
            pricing_data: { plans: [{ target_audience: 'individual' }] },
          },
        },
      ],
      'startup'
    );
    expect(ranked[0]?.slug).toBe('team-tool');
  });
});
