import { describe, expect, it } from 'vitest';
import { buildToolPagePrepDecisionStateFromDecisionContext } from '@/lib/tool-page/prep-decision-decision-context';
import { buildToolPagePrepDecisionStateFromRouteContext } from '@/lib/tool-page/prep-decision-state';

describe('tool page prep/decision decision context', () => {
  it('matches explicit route-context wiring', () => {
    const prep = {
      reviewSources: [{ source_url: 'https://docs.example.com' }],
      isEligibleEvidenceUrl: (value: string) => value.startsWith('https://'),
      tool: { slug: 'acme', name: 'Acme' },
      orderedAlternatives: [{ slug: 'alt-1', name: 'Alt 1' }],
    };
    const reviewContextSignals = {
      idealFor: ['small teams'],
      avoidIf: ['regulated workloads'],
      delighters: ['fast onboarding'],
      frustrations: ['limited exports'],
      powerTip: 'start with templates',
      humanVerdict: 'Strong choice for small teams.',
    };
    const decision = {
      tool: { slug: 'acme', name: 'Acme' },
      firstReview: null,
      reviewSelection: {
        firstPublished: null,
        selected: null,
        hasNewerUnpublishedThanPublished: false,
      },
      canonicalFacts: [],
      knowledgeCard: null,
      setupTracks: [{ title: 'Setup', bullets: ['Invite your team'] }],
      reviewContentLists: { pros: [], cons: [], sources: [] },
      audiences: [],
      reviewContextSignals,
      globalCons: [],
      categorySpecificData: null,
      vipSpecifics: null,
      hasParentTool: false,
      now: new Date('2026-03-05T00:00:00.000Z'),
      orderedAlternativesCount: 1,
    };

    const result = buildToolPagePrepDecisionStateFromDecisionContext({
      prep: prep as never,
      decision: decision as never,
    });

    const expected = buildToolPagePrepDecisionStateFromRouteContext({
      prep: prep as never,
      decision: {
        ...(decision as never),
        idealFor: reviewContextSignals.idealFor,
        avoidIf: reviewContextSignals.avoidIf,
        delighters: reviewContextSignals.delighters,
        frustrations: reviewContextSignals.frustrations,
        powerTip: reviewContextSignals.powerTip,
        humanVerdict: reviewContextSignals.humanVerdict,
      },
    });

    expect(result.prepState.hasComparableAlternatives).toBe(
      expected.prepState.hasComparableAlternatives
    );
    expect(result.prepState.hasEligibleNegativeEvidence).toBe(
      expected.prepState.hasEligibleNegativeEvidence
    );
    expect(result.prepState.eligibleSignalEvidenceCount).toBe(
      expected.prepState.eligibleSignalEvidenceCount
    );
    expect(JSON.parse(JSON.stringify(result.decisionSectionState))).toEqual(
      JSON.parse(JSON.stringify(expected.decisionSectionState))
    );
  });
});
