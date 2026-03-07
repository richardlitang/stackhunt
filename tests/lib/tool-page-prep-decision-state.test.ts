import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionSectionStateInputFromRouteContext } from '@/lib/tool-page/decision-section-route-input';
import { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision-section-state';
import { buildToolPagePrepDecisionStateFromRouteContext } from '@/lib/tool-page/prep-decision-state';
import { buildToolPagePrepStateInputFromRouteContext } from '@/lib/tool-page/prep-input';
import { buildToolPagePrepState } from '@/lib/tool-page/prep-state';

describe('tool page prep/decision composite state', () => {
  it('composes prep and decision states using prep-derived decision signals', () => {
    const input = {
      prep: {
        reviewSources: [{ url: 'https://docs.acme.com' }],
        isEligibleEvidenceUrl: (value: unknown) =>
          typeof value === 'string' && value.includes('acme.com'),
        tool: {
          slug: 'acme',
          metadata: {},
          item_category_links: [],
        },
        orderedAlternatives: [
          {
            slug: 'alt-one',
            metadata: {},
            item_category_links: [],
          },
        ],
      },
      decision: {
        tool: {
          name: 'Acme',
          short_description: 'Acme short',
          long_description: 'Acme long',
          pricing_type: 'subscription',
          verdict: null,
          website: 'https://acme.com',
          category: { slug: 'project-management' },
          last_verified_at: '2026-03-01T00:00:00.000Z',
          pricing_verified_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
        firstReview: {
          summary_markdown: 'Review summary',
          pros: ['Fast setup'],
          cons: ['Limited offline mode'],
          updated_at: '2026-02-28T00:00:00.000Z',
          created_at: '2026-02-20T00:00:00.000Z',
        },
        reviewSelection: {
          hasPublishedReview: true,
          hasDraftReview: false,
        },
        canonicalFacts: null,
        knowledgeCard: {
          support: { channels: ['email'] },
        },
        setupTracks: [{ title: 'Getting started', bullets: ['Create workspace'] }],
        reviewContentLists: {
          pros: ['Fast setup'],
          cons: ['Limited offline mode'],
        },
        audiences: ['small teams'],
        reviewContextSignals: {
          userAdvocate: null,
          humanVerdict: null,
          delighters: [],
          frustrations: [],
          powerTip: null,
          vibe: null,
          originStory: null,
          idealFor: [],
          avoidIf: [],
          budgetCostDrivers: [],
          budgetOneTimeFees: [],
          budgetCommitmentTerms: [],
          budgetRoiThreshold: null,
        },
        globalCons: ['Limited offline mode'],
        categorySpecificData: null,
        vipSpecifics: null,
        idealFor: ['Small teams'],
        avoidIf: ['Strict compliance orgs'],
        delighters: ['Fast setup'],
        frustrations: ['Limited offline mode'],
        powerTip: 'Use templates early',
        humanVerdict: 'Strong option',
        hasParentTool: false,
        now: new Date('2026-03-05T00:00:00.000Z'),
        orderedAlternativesCount: 1,
      },
    } as const;

    const result = buildToolPagePrepDecisionStateFromRouteContext(input);

    const expectedPrep = buildToolPagePrepState(
      buildToolPagePrepStateInputFromRouteContext(input.prep)
    );
    const expectedDecision = buildToolPageDecisionSectionState(
      buildToolPageDecisionSectionStateInputFromRouteContext({
        ...input.decision,
        hasEligibleNegativeEvidence: expectedPrep.hasEligibleNegativeEvidence,
        eligibleSignalEvidenceCount: expectedPrep.eligibleSignalEvidenceCount,
      })
    );

    expect(result.prepState.eligibleSignalEvidenceCount).toBe(
      expectedPrep.eligibleSignalEvidenceCount
    );
    expect(result.prepState.hasEligibleNegativeEvidence).toBe(
      expectedPrep.hasEligibleNegativeEvidence
    );
    expect(result.prepState.comparableAlternatives).toEqual(expectedPrep.comparableAlternatives);
    expect(result.prepState.hasComparableAlternatives).toBe(expectedPrep.hasComparableAlternatives);
    expect(result.decisionSectionState.qualityState).toEqual(expectedDecision.qualityState);
    expect(result.decisionSectionState.faqState).toEqual(expectedDecision.faqState);
    expect(result.decisionSectionState.displaySignals).toEqual(expectedDecision.displaySignals);
    expect(result.decisionSectionState.sectionFlags).toEqual(expectedDecision.sectionFlags);
    expect(result.decisionSectionState.presentationGates).toEqual(
      expectedDecision.presentationGates
    );
    expect(result.decisionSectionState.faqSchema).toEqual(expectedDecision.faqSchema);
  });

  it('propagates subject scope suppression into quality-state noindex blockers', () => {
    const input = {
      prep: {
        reviewSources: [{ url: 'https://docs.acme.com' }],
        isEligibleEvidenceUrl: (value: unknown) =>
          typeof value === 'string' && value.includes('acme.com'),
        tool: {
          slug: 'acme-enterprise',
          metadata: {},
          item_category_links: [],
        },
        orderedAlternatives: [],
      },
      decision: {
        tool: {
          name: 'Acme Enterprise',
          short_description: 'Acme short',
          long_description: 'Acme long',
          pricing_type: 'subscription',
          verdict: null,
          website: 'https://acme.com',
          category: { slug: 'project-management' },
          last_verified_at: '2026-03-01T00:00:00.000Z',
          pricing_verified_at: '2026-03-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
        },
        firstReview: null,
        reviewSelection: {
          hasPublishedReview: false,
          hasDraftReview: false,
        },
        canonicalFacts: null,
        resolvedSubject: {
          subjectType: 'plan_family',
          subjectKey: 'acme-enterprise:enterprise',
          displayName: 'Acme Enterprise',
          entityScope: null,
          confidence: 'low' as const,
          ambiguityReason: 'Enterprise family detected, but deployment mode is unresolved.',
        },
        subjectSelectionSuppressed: true,
        subjectSelectionReason:
          'Published review content is hidden until this page resolves one product surface.',
        knowledgeCard: {
          support: { channels: ['email'] },
        },
        setupTracks: null,
        reviewContentLists: {
          pros: [],
          cons: [],
        },
        audiences: [],
        reviewContextSignals: {
          userAdvocate: null,
          humanVerdict: null,
          delighters: [],
          frustrations: [],
          powerTip: null,
          vibe: null,
          originStory: null,
          idealFor: [],
          avoidIf: [],
          budgetCostDrivers: [],
          budgetOneTimeFees: [],
          budgetCommitmentTerms: [],
          budgetRoiThreshold: null,
        },
        globalCons: [],
        categorySpecificData: null,
        vipSpecifics: null,
        idealFor: [],
        avoidIf: [],
        delighters: [],
        frustrations: [],
        powerTip: null,
        humanVerdict: null,
        hasParentTool: false,
        now: new Date('2026-03-05T00:00:00.000Z'),
        orderedAlternativesCount: 0,
      },
    } as const;

    const result = buildToolPagePrepDecisionStateFromRouteContext(input);

    expect(result.decisionSectionState.qualityState.subjectScopePending).toBe(true);
    expect(result.decisionSectionState.qualityState.gateShouldIndex).toBe(false);
    expect(result.decisionSectionState.qualityState.gateReasons).toContain('subject_scope_pending');
  });
});
