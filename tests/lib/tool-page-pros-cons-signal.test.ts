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
    expect(
      classifyProsConsSourceType({ sourceUrl: 'https://community.figma.com/t/workflow/12345' })
    ).toBe('community');
    expect(classifyProsConsSourceType({ sourceUrl: 'https://forum.asana.com/t/tip/12345' })).toBe(
      'community'
    );
    expect(
      classifyProsConsSourceType({ sourceUrl: 'https://discourse.example.io/t/thread/1' })
    ).toBe('community');
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

  it('boosts high-confidence claims over medium-confidence claims when source type is equal', () => {
    const highConfidence = scoreProsConsClaimSignal({
      sourceType: 'editorial',
      text: 'Reviewers report cleaner reporting workflow',
      corroboratingSourceCount: 2,
      claimConfidenceTier: 'high',
    });
    const mediumConfidence = scoreProsConsClaimSignal({
      sourceType: 'editorial',
      text: 'Reviewers report cleaner reporting workflow',
      corroboratingSourceCount: 2,
      claimConfidenceTier: 'medium',
    });
    expect(highConfidence).toBeGreaterThan(mediumConfidence);
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

  it('dedupes repeated low-signal bullets by normalized text', () => {
    const ranked = prioritizeProsConsClaims([
      {
        displayText: 'Supports core workflows for CRM teams.',
        source_type: 'official' as const,
      },
      {
        displayText: 'Supports core workflows for CRM teams',
        source_type: 'official' as const,
      },
      {
        displayText: 'Users report cleaner contact routing setup',
        source_type: 'community' as const,
      },
    ]);

    expect(ranked).toHaveLength(2);
    expect(
      ranked.filter((item) => item.displayText.toLowerCase().includes('supports core workflows'))
    ).toHaveLength(1);
  });

  it('ensures top two contain at least one user-signal claim when available', () => {
    const ranked = prioritizeProsConsClaims([
      {
        displayText: 'Official docs mention automation templates and robust workflows',
        source_type: 'official' as const,
      },
      {
        displayText: 'Official docs describe field customization controls',
        source_type: 'official' as const,
      },
      {
        displayText: 'Users report setup friction for permissions at team handoff',
        source_type: 'community' as const,
      },
    ]);

    expect(
      ranked
        .slice(0, 2)
        .some((item) => item.source_type === 'community' || item.source_type === 'editorial')
    ).toBe(true);
  });
});
