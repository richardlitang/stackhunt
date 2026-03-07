import { describe, expect, it } from 'vitest';
import {
  buildToolPageContentSectionsStateInputFromRoute,
  buildToolPageContentSectionsStateInputFromRouteContext,
} from '@/lib/tool-page/content-sections-input';

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

  it('maps flattened route context into content sections state input', () => {
    const result = buildToolPageContentSectionsStateInputFromRouteContext({
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
      setupTracks: [],
      gettingStartedCtaUrl: 'https://example.com/start',
      prosConsSourcesCount: 3,
      communityCorroborationCount: 1,
      userSignalClaimsCount: 2,
      evidenceBasis: [{ label: 'Official', count: 2 }],
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
      displayCategorySpecificData: { workflows: 10 },
      vipSpecifics: { support_tier: 'priority' },
      categoryName: 'Project Management',
      specsVerifiedLabel: '2026-03-05',
      pricingCheckedLabel: '2026-03-05',
      hasOfficialPricingSource: true,
      pricingEvidenceCount: 2,
      hasSecurity: true,
      hasPortability: true,
      hasParentTool: false,
      tool: {
        name: 'Acme',
        website: 'https://fallback.com',
        long_description: 'Long description',
        affiliate_offers: [{ id: 'offer_1' }],
      },
    });

    expect(result.gettingStartedInput.toolName).toBe('Acme');
    expect(result.aboutContentInput.longDescription).toBe('Long description');
    expect(result.affiliateOffersInput.offers).toEqual([{ id: 'offer_1' }]);
    expect(result.strengthsSubtitleInput.communityCorroborationCount).toBe(1);
    expect(result.strengthsSubtitleInput.userSignalClaimsCount).toBe(2);
  });
});
