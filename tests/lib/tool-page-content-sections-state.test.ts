import { describe, expect, it } from 'vitest';
import {
  buildToolPageContentSectionsState,
  buildToolPageContentSectionsStateFromRoute,
} from '@/lib/tool-page/content-sections-state';

describe('tool page content sections state', () => {
  it('builds section props in one composition call', () => {
    const state = buildToolPageContentSectionsState({
      sourceListsInput: {
        evidenceLinks: [
          {
            title: 'Docs',
            url: 'https://example.com/docs',
            domain: 'example.com',
            basis: 'official_docs',
            quality: 'high',
            inclusionReason: 'official',
          },
        ],
        lowConfidenceEvidenceLinks: [
          {
            title: 'Forum',
            url: 'https://example.com/forum',
            domain: 'example.com',
            basis: 'community',
            quality: 'low',
            inclusionReason: 'anecdotal',
          },
        ],
      },
      prosConsInput: {
        pros: [{ text: 'Fast setup', sourceUrl: 'https://example.com/docs' }],
        cons: [{ text: 'No on-prem', sourceUrl: 'https://example.com/docs' }],
      },
      gettingStartedInput: {
        setupComplexity: 'Low',
        hasApi: true,
        websiteUrl: 'https://example.com',
        fallbackWebsiteUrl: 'https://fallback.example.com',
        setupTracks: { dev: [] },
        setupUrl: 'https://example.com/start',
        toolName: 'Acme',
      },
      strengthsSubtitleInput: {
        prosConsSourcesCount: 3,
      },
      affiliateOffersInput: {
        offers: [{ provider: 'partner', url: 'https://example.com/offer' }],
      },
      evidenceBasisInput: {
        evidenceBasis: ['docs_checked', 'pricing_checked'],
      },
      tribalKnowledgeInput: {
        hasCommunity: true,
        userAdvocate: { ideal_for: ['Startups'] },
        guardedHumanVerdict: 'Strong shortlist',
        vibe: 'Clean UX',
        originStory: 'Built for speed',
        idealFor: ['Startups'],
        guardedAvoidIf: ['Need on-prem'],
        powerTip: 'Use templates',
        delighters: ['Fast setup'],
        frustrations: ['No on-prem'],
      },
      platformSectionInput: {
        platforms: ['web', 'mac'],
        integrations: { has_api: true },
      },
      specsPropsInput: {
        displayCategorySpecificData: { seats: 'unlimited' },
        vipSpecifics: {},
        toolName: 'Acme',
        categoryName: 'Project Management',
      },
      specsSectionInput: {
        specsVerifiedLabel: '2026-03-05',
      },
      aboutContentInput: {
        longDescription: 'Longer description',
      },
      pricingSectionInput: {
        pricingCheckedLabel: '2026-03-05',
      },
      pricingEvidenceInput: {
        hasOfficialPricingSource: true,
        pricingEvidenceCount: 2,
      },
      pricingNoticeInput: {
        pricingCheckedLabel: '2026-03-05',
      },
      operationalDetailsInput: {
        hasSecurity: true,
        hasPortability: true,
        hasKnowledgeCard: true,
        hasParentTool: false,
        hasSupport: true,
        hasSecurityData: true,
        hasPortabilityData: true,
      },
    });

    expect(state.sourceListsView.methodologyLinks.length).toBe(1);
    expect(state.sourceListsView.lowConfidenceLinks.length).toBe(1);
    expect(state.prosConsView.pros.length).toBe(1);
    expect(state.prosConsView.cons.length).toBe(1);
    expect(state.prosConsView.userSignalPros.length).toBe(0);
    expect(state.prosConsView.userSignalCons.length).toBe(0);
    expect(state.pricingSectionState.checkedLead).toContain('Pricing checked');
    expect(state.pricingEvidenceState.hasEvidencePanel).toBe(true);
    expect(state.operationalDetailsState.showCompanyInfo).toBe(true);
    expect(state.operationalDetailsState.showSecurity).toBe(true);
  });

  it('builds content section state directly from route-level fields', () => {
    const state = buildToolPageContentSectionsStateFromRoute({
      evidenceLinks: [
        {
          title: 'Docs',
          url: 'https://example.com/docs',
          domain: 'example.com',
          basis: 'official_docs',
          quality: 'high',
          inclusionReason: 'official',
        },
      ],
      lowConfidenceEvidenceLinks: [],
      effectiveEvidencePros: [{ text: 'Fast setup', sourceUrl: 'https://example.com/docs' }],
      effectiveEvidenceCons: [{ text: 'No on-prem', sourceUrl: 'https://example.com/docs' }],
      knowledgeCard: {
        setup_complexity: 'Low',
        integrations: { has_api: true },
        website_url: 'https://example.com',
        platforms: ['web'],
      },
      fallbackWebsiteUrl: 'https://example.com',
      setupTracks: [],
      gettingStartedCtaUrl: 'https://example.com/start',
      toolName: 'Acme',
      prosConsSourcesCount: 2,
      affiliateOffers: [{ url: 'https://example.com/offer', cta_text: 'Get started' }],
      evidenceBasis: [{ label: 'docs_checked', count: 1 }],
      tribalKnowledge: {
        hasCommunity: true,
        userAdvocate: { ideal_for: ['Startups'] },
        guardedHumanVerdict: 'Strong shortlist',
        vibe: 'Clean UX',
        originStory: 'Built for speed',
        idealFor: ['Startups'],
        guardedAvoidIf: ['Need on-prem'],
        powerTip: 'Use templates',
        delighters: ['Fast setup'],
        frustrations: ['No on-prem'],
      },
      displayCategorySpecificData: { seats: 'unlimited' },
      vipSpecifics: {},
      categoryName: 'Project Management',
      specsVerifiedLabel: '2026-03-05',
      longDescription: 'Long description',
      pricingCheckedLabel: '2026-03-05',
      hasOfficialPricingSource: true,
      pricingEvidenceCount: 1,
      hasSecurity: true,
      hasPortability: true,
      hasParentTool: false,
    });

    expect(state.sourceListsView.methodologyLinks.length).toBe(1);
    expect(state.prosConsView.pros.length).toBe(1);
    expect(state.prosConsView.userSignalPros.length).toBe(0);
    expect(state.pricingEvidenceState.hasEvidencePanel).toBe(true);
  });
});
