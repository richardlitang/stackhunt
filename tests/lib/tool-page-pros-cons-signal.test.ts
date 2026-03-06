import {
  classifyProsConsSourceType,
  prioritizeProsConsClaims,
  scoreProsConsClaimSignal,
} from '@/lib/tool-page/pros-cons-signal';

describe('tool-page pros/cons signal weighting', () => {
  it('classifies community and editorial hosts', () => {
    expect(
      classifyProsConsSourceType({ sourceUrl: 'https://www.reddit.com/r/crm/comments/abc' })
    ).toBe('community');
    expect(
      classifyProsConsSourceType({ sourceUrl: 'https://www.g2.com/products/acme/reviews' })
    ).toBe('editorial');
    expect(classifyProsConsSourceType({ sourceUrl: 'https://docs.acme.com/help' })).toBe(
      'official'
    );
  });

  it('gives higher score to user-signal sources than official docs', () => {
    expect(
      scoreProsConsClaimSignal({
        sourceType: 'community',
        text: 'Users report faster follow-up flow',
      })
    ).toBeGreaterThan(
      scoreProsConsClaimSignal({ sourceType: 'official', text: 'Docs mention workflow automation' })
    );
  });

  it('boosts corroborated claims above single-source claims of same source type', () => {
    const corroborated = scoreProsConsClaimSignal({
      sourceType: 'community',
      text: 'Users report onboarding slows down on larger teams',
      corroboratingSourceCount: 3,
    });
    const singleSource = scoreProsConsClaimSignal({
      sourceType: 'community',
      text: 'Users report onboarding slows down on larger teams',
      corroboratingSourceCount: 1,
    });
    expect(corroborated).toBeGreaterThan(singleSource);
  });

  it('prioritizes community and editorial claims ahead of official claims', () => {
    const ranked = prioritizeProsConsClaims([
      {
        displayText: 'Official docs mention automation templates',
        source_type: 'official' as const,
        corroborating_source_count: 3,
      },
      {
        displayText: 'Users report setup friction when adding reps',
        source_type: 'community' as const,
        corroborating_source_count: 2,
      },
      {
        displayText: 'Reviewers note stronger reporting than peers',
        source_type: 'editorial' as const,
      },
    ]);

    expect(ranked[0]?.source_type).toBe('community');
    expect(ranked[1]?.source_type).toBe('editorial');
    expect(ranked[2]?.source_type).toBe('official');
  });
});
