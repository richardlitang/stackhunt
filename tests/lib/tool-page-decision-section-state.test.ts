import { describe, expect, it } from 'vitest';
import {
  buildToolPageDecisionSectionState,
} from '@/lib/tool-page/decision-section-state';
import { buildToolPageDecisionSectionStateInputFromRoute } from '@/lib/tool-page/decision-section-route-input';
import { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import { buildToolPageDecisionRuntimeInput } from '@/lib/tool-page/decision-runtime-input';
import { buildToolPageDisplaySignals } from '@/lib/tool-page/display-signals';
import { buildToolPageFaqSchema } from '@/lib/tool-page/faq-schema';
import { buildToolPageFaqState } from '@/lib/tool-page/faq';
import { buildToolPagePresentationGates } from '@/lib/tool-page/presentation-gates';
import { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import { buildToolPageQualityStateInput } from '@/lib/tool-page/quality-state-input';
import { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import { buildToolPageSectionRuntime } from '@/lib/tool-page/section-runtime';
import { buildToolPageSectionRuntimeInput } from '@/lib/tool-page/section-runtime-input';

describe('tool page decision section state', () => {
  it('matches the previous quality->decision->section orchestration', () => {
    const input = {
      qualityStateInput: {
        tool: {
          metadata: { faqs: [{ question: 'Q', answer: 'A' }] },
          specs: { canonical: { key: 'value' } },
          website: 'https://example.com',
          review_context: null,
        },
        firstReview: null,
        reviewSelection: { firstPublished: null, hasNewerUnpublishedThanPublished: false },
        canonicalFacts: { key: 'value' },
      },
      faqStateInput: { faqs: [{ question: 'Q', answer: 'A' }] },
      displaySignalsInput: {
        toolPricingType: 'Freemium',
        reviewSummaryMarkdown: 'Summary',
        toolVerdict: 'Strong shortlist',
        humanVerdict: null,
      },
      decisionRuntimeInput: {
        tool: {
          name: 'Acme',
          short_description: 'Short',
          long_description: 'Long',
          pricing_type: 'Freemium',
          verdict: 'Strong shortlist',
          website: 'https://example.com',
          category: { slug: 'project-management' },
        },
        knowledgeCard: { faqs: [{ question: 'Q', answer: 'A' }] },
        setupTracks: null,
        firstReviewSummaryMarkdown: 'Summary',
        reviewPros: ['Fast setup'],
        reviewCons: ['No on-prem'],
        audiences: [{ name: 'Startups' }],
        reviewContextSignals: {
          userAdvocate: null,
          budgetAnalyst: null,
          humanVerdict: null,
          decisionSlotsRaw: null,
          decisionIntroRaw: null,
          delighters: [],
          frustrations: [],
          powerTip: null,
          vibe: null,
          originStory: null,
          idealFor: ['Startups'],
          avoidIf: ['On-prem required'],
          budgetCostDrivers: [],
          budgetOneTimeFees: [],
          budgetCommitmentTerms: null,
          budgetRoiThreshold: null,
        },
        globalCons: ['No on-prem'],
        hasEligibleNegativeEvidence: true,
      },
      sectionRuntimeInput: {
        knowledgeCard: {
          features: { core: ['A'], unique: ['B'] },
          platforms: ['web'],
          integrations: { has_api: true },
          security: { soc2: true },
          smp_portability: { csv: true },
        },
        categorySpecificData: { key: 'value' },
        vipSpecifics: {},
        orderedAlternativesCount: 2,
        eligibleSignalEvidenceCount: 2,
        idealFor: ['Startups'],
        avoidIf: ['On-prem required'],
        delighters: ['Fast setup'],
        frustrations: ['No on-prem'],
        powerTip: 'Use templates',
        humanVerdict: 'Strong shortlist',
        firstReviewUpdatedAt: null,
        firstReviewCreatedAt: null,
        toolLastVerifiedAt: null,
        toolPricingVerifiedAt: null,
        toolUpdatedAt: null,
        hasParentTool: false,
        hasSupportData: true,
        now: new Date('2026-03-05T00:00:00.000Z'),
      },
      faqSchemaInput: {
        tool: { name: 'Acme', slug: 'acme' },
      },
    };

    const state = buildToolPageDecisionSectionState(input);

    const qualityState = buildToolPageQualityState(
      buildToolPageQualityStateInput(input.qualityStateInput)
    );
    const faqState = buildToolPageFaqState(input.faqStateInput);
    const displaySignals = buildToolPageDisplaySignals(input.displaySignalsInput);
    const decisionRuntime = buildToolPageDecisionRuntime(
      buildToolPageDecisionRuntimeInput({
        ...input.decisionRuntimeInput,
        sectionStatus: {
          pricing: qualityState.sectionStatus.pricing || 'hide',
          verdict: qualityState.sectionStatus.verdict || 'hide',
        },
        renderVerdict: displaySignals.renderVerdict,
      })
    );
    const sectionRuntime = buildToolPageSectionRuntime(
      buildToolPageSectionRuntimeInput({
        ...input.sectionRuntimeInput,
        faqItems: faqState.faqItems,
        sectionPublishabilityFaq: qualityState.sectionPublishability.faq,
        sectionStatus: {
          specs: qualityState.sectionStatus.specs || 'hide',
          community: qualityState.sectionStatus.community || 'hide',
        },
        contentConfidenceLevel: qualityState.contentConfidenceLevel,
        hasGettingStartedData: decisionRuntime.hasGettingStartedRaw,
      })
    );
    const sectionFlags = buildToolPageSectionFlags(sectionRuntime);
    const presentationGates = buildToolPagePresentationGates({
      hasProceduralGuidance: qualityState.hasProceduralGuidance,
      sectionStatus: {
        verdict: qualityState.sectionStatus.verdict || 'hide',
        specs: qualityState.sectionStatus.specs || 'hide',
      },
      hasVerdict: decisionRuntime.hasVerdict,
      hasSpecs: sectionFlags.hasSpecs,
    });
    const faqSchema = buildToolPageFaqSchema({
      ...input.faqSchemaInput,
      hasFAQ: sectionFlags.hasFAQ,
      knowledgeCardForSeo: faqState.knowledgeCardForSeo,
    });

    expect(state.qualityState).toEqual(qualityState);
    expect(state.faqState).toEqual(faqState);
    expect(state.displaySignals).toEqual(displaySignals);
    expect(state.decisionRuntime.hasVerdict).toEqual(decisionRuntime.hasVerdict);
    expect(state.decisionRuntime.decisionSnapshotSummary).toEqual(
      decisionRuntime.decisionSnapshotSummary
    );
    expect(state.decisionRuntime.decisionSnapshotBestWhen).toEqual(
      decisionRuntime.decisionSnapshotBestWhen
    );
    expect(state.decisionRuntime.decisionSnapshotWatchOuts).toEqual(
      decisionRuntime.decisionSnapshotWatchOuts
    );
    expect(state.sectionFlags).toEqual(sectionFlags);
    expect(state.presentationGates).toEqual(presentationGates);
    expect(state.faqSchema).toEqual(faqSchema);
  });

  it('builds decision section state from route input wrapper', () => {
    const input = {
      qualityStateInput: {
        tool: {
          metadata: { faqs: [{ question: 'Q', answer: 'A' }] },
          specs: { canonical: { key: 'value' } },
          website: 'https://example.com',
          review_context: null,
        },
        firstReview: null,
        reviewSelection: { firstPublished: null, hasNewerUnpublishedThanPublished: false },
        canonicalFacts: { key: 'value' },
      },
      faqStateInput: { faqs: [{ question: 'Q', answer: 'A' }] },
      displaySignalsInput: {
        toolPricingType: 'Freemium',
        reviewSummaryMarkdown: 'Summary',
        toolVerdict: 'Strong shortlist',
        humanVerdict: null,
      },
      decisionRuntimeInput: {
        tool: {
          name: 'Acme',
          short_description: 'Short',
          long_description: 'Long',
          pricing_type: 'Freemium',
          verdict: 'Strong shortlist',
          website: 'https://example.com',
          category: { slug: 'project-management' },
        },
        knowledgeCard: { faqs: [{ question: 'Q', answer: 'A' }] },
        setupTracks: null,
        firstReviewSummaryMarkdown: 'Summary',
        reviewPros: ['Fast setup'],
        reviewCons: ['No on-prem'],
        audiences: [{ name: 'Startups' }],
        reviewContextSignals: {
          userAdvocate: null,
          budgetAnalyst: null,
          humanVerdict: null,
          decisionSlotsRaw: null,
          decisionIntroRaw: null,
          delighters: [],
          frustrations: [],
          powerTip: null,
          vibe: null,
          originStory: null,
          idealFor: ['Startups'],
          avoidIf: ['On-prem required'],
          budgetCostDrivers: [],
          budgetOneTimeFees: [],
          budgetCommitmentTerms: null,
          budgetRoiThreshold: null,
        },
        globalCons: ['No on-prem'],
        hasEligibleNegativeEvidence: true,
      },
      sectionRuntimeInput: {
        knowledgeCard: {
          features: { core: ['A'], unique: ['B'] },
          platforms: ['web'],
          integrations: { has_api: true },
          security: { soc2: true },
          smp_portability: { csv: true },
        },
        categorySpecificData: { key: 'value' },
        vipSpecifics: {},
        orderedAlternativesCount: 2,
        eligibleSignalEvidenceCount: 2,
        idealFor: ['Startups'],
        avoidIf: ['On-prem required'],
        delighters: ['Fast setup'],
        frustrations: ['No on-prem'],
        powerTip: 'Use templates',
        humanVerdict: 'Strong shortlist',
        firstReviewUpdatedAt: null,
        firstReviewCreatedAt: null,
        toolLastVerifiedAt: null,
        toolPricingVerifiedAt: null,
        toolUpdatedAt: null,
        hasParentTool: false,
        hasSupportData: true,
        now: new Date('2026-03-05T00:00:00.000Z'),
      },
      faqSchemaInput: {
        tool: { name: 'Acme', slug: 'acme' },
      },
    };

    const state = buildToolPageDecisionSectionState(
      buildToolPageDecisionSectionStateInputFromRoute(input)
    );
    expect(state.sectionFlags.hasFAQ).toBeTypeOf('boolean');
    expect(state.presentationGates.showProceduralVerdict).toBeTypeOf('boolean');
  });
});
