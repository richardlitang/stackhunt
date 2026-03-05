import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesPricingStateInputFromRouteContext } from '@/lib/tool-page/alternatives-pricing-input';
import { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import { buildToolPageContentAlternativesStateFromRouteContext } from '@/lib/tool-page/content-alternatives-state';
import { buildToolPageContentSectionsStateInputFromRouteContext } from '@/lib/tool-page/content-sections-input';
import { buildToolPageContentSectionsState } from '@/lib/tool-page/content-sections-state';

describe('tool page content/alternatives composite state', () => {
  it('composes alternatives pricing and content section states from route context', () => {
    const alternativesPricing = {
      budgetCostDrivers: ['Seat cost rises with add-ons'],
      budgetOneTimeFees: ['Implementation fee'],
      budgetCommitmentTerms: ['Annual discount'],
      budgetRoiThreshold: 'Worth it above 10 seats',
      alternativesLabel: 'Alternatives' as const,
      category: { slug: 'project-management', name: 'Project Management' },
      comparableAlternatives: [
        {
          slug: 'alt-one',
          name: 'Alt One',
          pricing_type: 'subscription',
          base_score: 75,
          specs: {},
        },
      ],
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
      canCompareByAlternativeSlug: () => true,
      tool: { slug: 'acme', specs: {} },
    };

    const contentSections = {
      evidenceLinks: [{ source: 'Docs', url: 'https://example.com/docs', kind: 'docs_checked' }],
      lowConfidenceEvidenceLinks: [{ source: 'Forum', url: 'https://example.com/forum' }],
      effectiveEvidencePros: ['Fast setup'],
      effectiveEvidenceCons: ['Limited offline mode'],
      knowledgeCard: null,
      setupTracks: [{ title: 'Start', bullets: ['Invite team'] }],
      gettingStartedCtaUrl: '/tool/acme#getting-started',
      prosConsSourcesCount: 3,
      evidenceBasis: [{ label: 'docs_checked', count: 2 }],
      hasCommunity: true,
      userAdvocate: 'Great for async teams',
      guardedHumanVerdict: 'Strong contender',
      vibe: 'Pragmatic',
      originStory: 'Built for remote work',
      idealFor: 'Teams under 50',
      guardedAvoidIf: 'Heavy compliance needs',
      powerTip: 'Use templates early',
      delighters: ['Fast onboarding'],
      frustrations: ['Sparse offline support'],
      displayCategorySpecificData: false,
      vipSpecifics: null,
      categoryName: 'Project Management',
      specsVerifiedLabel: 'Specs checked',
      pricingCheckedLabel: 'Pricing checked',
      hasOfficialPricingSource: true,
      pricingEvidenceCount: 2,
      hasSecurity: true,
      hasPortability: true,
      hasParentTool: false,
      tool: { slug: 'acme' },
    };

    const result = buildToolPageContentAlternativesStateFromRouteContext({
      alternativesPricing,
      contentSections,
    });

    const expectedAlternativesPricing = buildToolPageAlternativesPricingState(
      buildToolPageAlternativesPricingStateInputFromRouteContext(alternativesPricing)
    );
    const expectedContentSections = buildToolPageContentSectionsState(
      buildToolPageContentSectionsStateInputFromRouteContext(contentSections)
    );

    expect(result.alternativesPricingState).toEqual(expectedAlternativesPricing);
    expect(result.contentSectionsState).toEqual(expectedContentSections);
  });
});
