import { describe, it, expect } from 'vitest';
import { validateAnalysis } from '@/lib/hunter/validation/schema-validator';

function baseAnalysis() {
  return {
    score: 82,
    pros: [
      {
        text: 'API access is documented with authentication examples',
        source: 'https://example.com/docs/api',
        source_type: 'official',
        claim_type: 'fact',
      },
      {
        text: 'Native export supports CSV and JSON workflows',
        source: 'https://example.com/docs/export',
        source_type: 'official',
        claim_type: 'fact',
      },
    ],
    cons: [
      {
        text: 'Enterprise SSO is only available on higher tiers',
        source: 'https://example.com/pricing',
        source_type: 'official',
        claim_type: 'fact',
      },
      {
        text: 'Teams may need engineering support to maintain self-hosted deployments',
        source: 'https://example.com/docs/self-hosting',
        source_type: 'official',
        claim_type: 'opinion',
      },
    ],
    summary:
      'This tool is strongest when teams need structured automation and API control, but requires technical setup for self-hosted and enterprise governance workflows.',
    reviewContext: {
      decisionIntro: {
        what_it_is:
          'This review explains where the product fits for software teams evaluating AI-assisted development workflows.',
        best_for:
          'Best for teams that need source-backed automation with documented API and export controls.',
        not_for:
          'Not for teams that need enterprise governance features without paying for higher tiers.',
        main_tradeoff:
          'Main tradeoff is stronger API flexibility versus higher setup effort for advanced deployment paths.',
      },
      decisionEvidence: {
        best_for_reason: {
          text: 'API access is documented with authentication examples',
          source_url: 'https://example.com/docs/api',
        },
        not_for_reason: {
          text: 'Enterprise SSO is only available on higher tiers',
          source_url: 'https://example.com/pricing',
        },
        tradeoff_reason: {
          text: 'Teams may need engineering support to maintain self-hosted deployments',
          source_url: 'https://example.com/docs/self-hosting',
        },
      },
    },
    graphTags: {
      functions: ['Database'],
      audiences: ['Startups'],
      platforms: ['Web'],
    },
  };
}

describe('validateAnalysis claim hygiene', () => {
  it('flags truncated claims and blocks publish', () => {
    const analysis = baseAnalysis();
    analysis.cons[0].text = 'Advanced administrative features like SSO and RBAC are restricted to';

    const report = validateAnalysis(analysis);

    expect(report.shouldPublish).toBe(false);
    expect(report.humanReviewRequired).toBe(true);
    expect(report.validations.some((v) => v.message.includes('malformed or truncated'))).toBe(true);
  });

  it('flags community-style hedging on official sources and blocks publish', () => {
    const analysis = baseAnalysis();
    analysis.cons[1].text =
      'Users report that advanced API usage requires developer-level understanding';
    analysis.cons[1].source_type = 'official';

    const report = validateAnalysis(analysis);

    expect(report.shouldPublish).toBe(false);
    expect(report.humanReviewRequired).toBe(true);
    expect(
      report.validations.some((v) => v.message.includes('community-style hedging'))
    ).toBe(true);
  });

  it('allows clean, sourced claims', () => {
    const report = validateAnalysis(baseAnalysis());

    expect(report.isValid).toBe(true);
    expect(report.shouldPublish).toBe(true);
    expect(report.humanReviewRequired).toBe(false);
  });

  it('blocks publish when decision intro is missing', () => {
    const analysis = baseAnalysis();
    delete (analysis as any).reviewContext;

    const report = validateAnalysis(analysis);

    expect(report.shouldPublish).toBe(false);
    expect(report.validations.some((v) => v.field === 'reviewContext.decisionIntro')).toBe(true);
  });

  it('blocks publish when decision evidence is missing', () => {
    const analysis = baseAnalysis();
    delete (analysis.reviewContext as any).decisionEvidence;

    const report = validateAnalysis(analysis);

    expect(report.shouldPublish).toBe(false);
    expect(report.validations.some((v) => v.field === 'reviewContext.decisionEvidence')).toBe(true);
  });

  it('blocks publish when decision intro uses generic language', () => {
    const analysis = baseAnalysis();
    analysis.reviewContext!.decisionIntro!.main_tradeoff =
      'This is a robust and powerful solution for modern teams.';

    const report = validateAnalysis(analysis);

    expect(report.shouldPublish).toBe(false);
    expect(
      report.validations.some(
        (v) =>
          v.field === 'reviewContext.decisionIntro.main_tradeoff' &&
          v.message.includes('generic language')
      )
    ).toBe(true);
  });
});
