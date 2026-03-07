import { describe, expect, it } from 'vitest';
import { buildToolPageContentAlternativesStateFromDecisionContext } from '@/lib/tool-page/content-alternatives-decision-context';
import { buildToolPageContentAlternativesStateFromRouteContext } from '@/lib/tool-page/content-alternatives-state';
import { toToolPageObjectArray } from '@/lib/tool-page/route-normalizers';

describe('tool page content/alternatives decision context', () => {
  it('matches explicit route-context wiring', () => {
    const input = {
      activeReviewLens: 'startup' as const,
      alternativesLabel: 'Alternatives' as const,
      toolCategoryRef: { slug: 'project-management', name: 'Project Management' },
      orderedAlternatives: [
        {
          id: 'alt_1',
          slug: 'alt-one',
          name: 'Alt One',
          logo_url: null,
          short_description: null,
          avg_score: null,
          pricing_type: 'subscription',
          learning_curve: null,
          base_score: 75,
          specs: {},
          metadata: null,
          item_category_links: null,
        },
      ],
      comparableAlternatives: [{ slug: 'alt-one', name: 'Alt One' }],
      canCompareByAlternativeSlug: { 'alt-one': true },
      tool: {
        name: 'Acme',
        slug: 'acme',
        specs: {},
        website: 'https://acme.com',
        long_description: 'Acme long description',
        affiliate_offers: [],
      },
      knowledgeCard: null,
      parentTool: null,
      setupTracks: [{ title: 'Start', bullets: ['Invite team'] }],
      displayCategorySpecificData: null,
      vipSpecifics: null,
      decisionRuntime: {
        setupSignals: { gettingStartedCtaUrl: '/tool/acme#getting-started' },
        guardedHumanVerdict: 'Strong contender',
        guardedAvoidIf: ['Strict compliance orgs'],
      },
      sectionFlags: {
        hasCommunity: true,
        hasSecurity: true,
        hasPortability: true,
      },
      evidenceRuntime: {
        effectiveEvidencePros: [{ text: 'Fast setup', sourceUrl: 'https://acme.com/docs' }],
        effectiveEvidenceCons: [
          { text: 'Limited offline mode', sourceUrl: 'https://acme.com/docs' },
        ],
        collectedSourcesBySection: { pros_cons: 3 },
        pricingCheckedLabel: '2026-03-05',
        officialPricingSource: { url: 'https://acme.com/pricing' },
        pricingEvidenceLinks: [{ text: 'Pricing evidence', sourceUrl: 'https://acme.com/pricing' }],
      },
      reviewArtifactsState: {
        evidenceLinks: [
          {
            url: 'https://acme.com/docs',
            title: 'Acme Docs',
            domain: 'acme.com',
            basis: 'Official docs/help center',
            quality: 'high',
            inclusionReason: 'Primary docs',
          },
        ],
        lowConfidenceEvidenceLinks: [
          {
            url: 'https://forum.example.com/thread',
            title: 'Forum thread',
            domain: 'forum.example.com',
            basis: 'Community forum',
            quality: 'low',
            inclusionReason: 'User report',
          },
        ],
        evidenceBasis: [{ label: 'docs_checked', count: 2 }],
      },
      reviewSignalsView: {
        specsVerifiedLabel: '2026-03-04',
      },
      reviewContextSignals: {
        budgetCostDrivers: ['Per-seat growth'],
        budgetOneTimeFees: ['Implementation fee'],
        budgetCommitmentTerms: ['Annual discount'],
        budgetRoiThreshold: '10 seats',
        userAdvocate: { audience: 'small teams' },
        vibe: 'Pragmatic',
        originStory: 'Built for remote work',
        idealFor: ['Small teams'],
        powerTip: 'Use templates',
        delighters: ['Fast onboarding'],
        frustrations: ['Limited offline mode'],
      },
      qualityState: {
        communityCorroborationCount: 2,
        userSignalClaimsCount: 3,
      },
    } as const;

    const result = buildToolPageContentAlternativesStateFromDecisionContext(input);

    const expected = buildToolPageContentAlternativesStateFromRouteContext({
      alternativesPricing: {
        activeReviewLens: input.activeReviewLens,
        budgetCostDrivers: input.reviewContextSignals.budgetCostDrivers,
        budgetOneTimeFees: input.reviewContextSignals.budgetOneTimeFees,
        budgetCommitmentTerms: input.reviewContextSignals.budgetCommitmentTerms,
        budgetRoiThreshold: input.reviewContextSignals.budgetRoiThreshold,
        alternativesLabel: input.alternativesLabel,
        category: input.toolCategoryRef,
        comparableAlternatives: input.comparableAlternatives,
        orderedAlternatives: input.orderedAlternatives,
        canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
        tool: {
          slug: input.tool.slug,
          specs: input.tool.specs,
        },
      },
      contentSections: {
        evidenceLinks: input.reviewArtifactsState.evidenceLinks,
        lowConfidenceEvidenceLinks: input.reviewArtifactsState.lowConfidenceEvidenceLinks,
        effectiveEvidencePros: input.evidenceRuntime.effectiveEvidencePros,
        effectiveEvidenceCons: input.evidenceRuntime.effectiveEvidenceCons,
        knowledgeCard: input.knowledgeCard,
        setupTracks: toToolPageObjectArray(input.setupTracks),
        gettingStartedCtaUrl: input.decisionRuntime.setupSignals.gettingStartedCtaUrl,
        prosConsSourcesCount: input.evidenceRuntime.collectedSourcesBySection.pros_cons,
        communityCorroborationCount: input.qualityState.communityCorroborationCount,
        userSignalClaimsCount: input.qualityState.userSignalClaimsCount,
        evidenceBasis: input.reviewArtifactsState.evidenceBasis,
        hasCommunity: input.sectionFlags.hasCommunity,
        userAdvocate: input.reviewContextSignals.userAdvocate,
        guardedHumanVerdict: input.decisionRuntime.guardedHumanVerdict,
        vibe: input.reviewContextSignals.vibe,
        originStory: input.reviewContextSignals.originStory,
        idealFor: input.reviewContextSignals.idealFor,
        guardedAvoidIf: input.decisionRuntime.guardedAvoidIf,
        powerTip: input.reviewContextSignals.powerTip,
        delighters: input.reviewContextSignals.delighters,
        frustrations: input.reviewContextSignals.frustrations,
        displayCategorySpecificData: input.displayCategorySpecificData,
        vipSpecifics: input.vipSpecifics,
        categoryName: input.toolCategoryRef.name,
        specsVerifiedLabel: input.reviewSignalsView.specsVerifiedLabel,
        pricingCheckedLabel: input.evidenceRuntime.pricingCheckedLabel,
        hasOfficialPricingSource: true,
        pricingEvidenceCount: input.evidenceRuntime.pricingEvidenceLinks.length,
        hasSecurity: input.sectionFlags.hasSecurity,
        hasPortability: input.sectionFlags.hasPortability,
        hasParentTool: false,
        tool: {
          name: input.tool.name,
          website: input.tool.website,
          long_description: input.tool.long_description,
          affiliate_offers: input.tool.affiliate_offers,
        },
      },
    });

    expect(result.alternativesPricingState).toEqual(expected.alternativesPricingState);
    expect(result.contentSectionsState).toEqual(expected.contentSectionsState);
  });
});
