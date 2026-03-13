import { describe, expect, it } from 'vitest';
import { buildToolPageContentSectionsStateInputFromRoute } from '@/lib/tool-page/content-sections-input';

describe('tool page content sections input', () => {
  it('maps route fields into content sections state input', () => {
    const result = buildToolPageContentSectionsStateInputFromRoute({
      evidenceLinks: [{ text: 'docs' }],
      lowConfidenceEvidenceLinks: [{ text: 'community' }],
      effectiveEvidencePros: [{ text: 'Fast' }],
      effectiveEvidenceCons: [{ text: 'Pricey' }],
      knowledgeCard: {
        setup_complexity: 'Easy',
        integrations: { has_api: true },
        website_url: 'https://example.com',
        platforms: ['web'],
        support: { email: true },
        security: { soc2: true },
        smp_portability: { export: true },
      },
      fallbackWebsiteUrl: 'https://fallback.com',
      setupTracks: [],
      gettingStartedCtaUrl: 'https://example.com/start',
      toolName: 'Acme',
      prosConsSourcesCount: 3,
      communityCorroborationCount: 2,
      userSignalClaimsCount: 5,
      affiliateOffers: [{ id: 'offer_1' }],
      evidenceBasis: [{ label: 'Official', count: 2 }],
      tribalKnowledge: {
        hasCommunity: true,
        userAdvocate: { persona: 'Power users' },
        guardedHumanVerdict: 'Strong for SMB teams',
        vibe: 'Pragmatic',
        originStory: 'Born from consulting',
        idealFor: ['Small teams'],
        guardedAvoidIf: ['Complex procurement'],
        powerTip: 'Start with one workflow',
        delighters: ['Fast setup'],
        frustrations: ['Limited enterprise controls'],
      },
      displayCategorySpecificData: { workflows: 10 },
      vipSpecifics: { support_tier: 'priority' },
      categoryName: 'Project Management',
      specsVerifiedLabel: '2026-03-05',
      longDescription: 'Long description',
      pricingCheckedLabel: '2026-03-05',
      hasOfficialPricingSource: true,
      pricingEvidenceCount: 2,
      hasSecurity: true,
      hasPortability: true,
      hasParentTool: false,
    });

    expect(result.gettingStartedInput.hasApi).toBe(true);
    expect(result.affiliateOffersInput.offers).toEqual([{ id: 'offer_1' }]);
    expect(result.operationalDetailsInput.hasSecurity).toBe(true);
    expect(result.operationalDetailsInput.hasParentTool).toBe(false);
    expect(result.pricingEvidenceInput.pricingEvidenceCount).toBe(2);
    expect(result.strengthsSubtitleInput.communityCorroborationCount).toBe(2);
    expect(result.strengthsSubtitleInput.userSignalClaimsCount).toBe(5);
  });
  it('merges lane user-signal entries with legacy user-reported arrays', () => {
    const result = buildToolPageContentSectionsStateInputFromRoute({
      evidenceLinks: [],
      lowConfidenceEvidenceLinks: [],
      effectiveEvidencePros: [],
      effectiveEvidenceCons: [],
      userReportedPros: [
        {
          text: 'Users report fast onboarding after template setup.',
          source_url: 'https://reddit.com/r/saas/1',
          source_type: 'community',
        },
      ],
      userReportedCons: [],
      laneOutputs: {
        user_signal_sheet: {
          user_signal_pros: [
            {
              text: 'Users report fast onboarding after template setup.',
              source_url: 'https://reddit.com/r/saas/1',
              source_type: 'community',
            },
            {
              text: 'Reviewers note smoother rollout for SMB teams.',
              source_url: 'https://example.com/review',
              source_type: 'editorial',
            },
          ],
          user_signal_cons: [
            {
              text: 'Users report occasional lag in larger workspaces.',
              source_url: 'https://news.ycombinator.com/item?id=123',
              source_type: 'community',
            },
          ],
        },
      },
      knowledgeCard: null,
      fallbackWebsiteUrl: null,
      setupTracks: [],
      gettingStartedCtaUrl: null,
      toolName: 'Acme',
      prosConsSourcesCount: 0,
      affiliateOffers: [],
      evidenceBasis: [],
      tribalKnowledge: {
        hasCommunity: false,
        userAdvocate: null,
        guardedHumanVerdict: null,
        vibe: null,
        originStory: null,
        idealFor: [],
        guardedAvoidIf: [],
        powerTip: null,
        delighters: [],
        frustrations: [],
      },
      displayCategorySpecificData: null,
      vipSpecifics: null,
      categoryName: null,
      specsVerifiedLabel: null,
      longDescription: null,
      pricingCheckedLabel: null,
      hasOfficialPricingSource: false,
      pricingEvidenceCount: 0,
      hasSecurity: false,
      hasPortability: false,
      hasParentTool: false,
    });

    expect(result.prosConsInput.userReportedPros).toHaveLength(2);
    expect(result.prosConsInput.userReportedCons).toHaveLength(1);
  });
});
