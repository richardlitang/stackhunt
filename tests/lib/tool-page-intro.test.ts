import { describe, expect, it } from 'vitest';
import { generateDecisionEvidence, generateDecisionIntro } from '@/lib/tool-page-intro';

describe('tool page intro generator', () => {
  it('creates decision-first intro from specific pros/cons', () => {
    const intro = generateDecisionIntro({
      toolName: 'ExampleTool',
      shortDescription: 'ExampleTool helps engineering teams automate CI policy checks.',
      pros: ['integrates directly with GitHub branch protections'],
      cons: ['enterprise policy packs require higher-tier plans'],
    });

    expect(intro.what_it_is).toContain('ExampleTool');
    expect(intro.best_for.toLowerCase()).toContain('best for');
    expect(intro.not_for.toLowerCase()).toContain('not for');
    expect(intro.main_tradeoff.toLowerCase()).toContain('main tradeoff');
    expect(intro.summary.length).toBeGreaterThan(40);
  });

  it('removes generic verdict language', () => {
    const intro = generateDecisionIntro({
      toolName: 'ToolX',
      shortDescription: 'ToolX is a robust and powerful solution for modern teams.',
      pros: ['worth shortlisting for most teams'],
      cons: ['best-in-class capabilities are only on enterprise'],
    });

    expect(intro.what_it_is.toLowerCase()).not.toContain('robust and powerful solution');
    expect(intro.best_for.toLowerCase()).not.toContain('worth shortlisting');
    expect(intro.not_for.toLowerCase()).not.toContain('best-in-class capabilities');
  });

  it('uses non-generic fallback narrative when description is missing', () => {
    const intro = generateDecisionIntro({
      toolName: 'FallbackTool',
      shortDescription: null,
      pros: [],
      cons: [],
    });

    expect(intro.what_it_is.toLowerCase()).toContain('reviewed');
    expect(intro.what_it_is.toLowerCase()).not.toContain('software buying decision');
  });

  it('generates source-backed decision evidence from claims', () => {
    const evidence = generateDecisionEvidence(
      [
        {
          text: 'GitHub-native onboarding is documented',
          source_url: 'https://example.com/docs/onboarding',
          source_type: 'official',
          claim_type: 'fact',
        },
      ],
      [
        {
          text: 'Advanced policy controls are enterprise-only',
          source_url: 'https://example.com/pricing',
          source_type: 'official',
          claim_type: 'fact',
        },
      ]
    );

    expect(evidence.best_for_reason?.source_url).toBe('https://example.com/docs/onboarding');
    expect(evidence.not_for_reason?.source_url).toBe('https://example.com/pricing');
    expect(evidence.tradeoff_reason?.text).toBeTruthy();
  });

  it('prefers specific claim evidence over generic first claim text', () => {
    const intro = generateDecisionIntro({
      toolName: 'SpecificTool',
      shortDescription: 'SpecificTool supports AI-assisted coding workflows for teams.',
      pros: ['great for teams', 'supports 200k token context windows on enterprise plans'],
      cons: ['some users report issues', 'rate limit is 60 requests/min on lower tiers'],
      proClaims: [
        { text: 'great for teams', source_url: 'https://example.com/marketing', source_type: 'editorial' },
        {
          text: 'Supports 200k token context windows on enterprise tiers',
          source_url: 'https://example.com/docs/limits',
          source_type: 'official',
          claim_type: 'fact',
        },
      ],
      conClaims: [
        { text: 'some users report issues', source_url: 'https://example.com/community', source_type: 'community' },
        {
          text: 'Rate limit is 60 requests/min on lower tiers',
          source_url: 'https://example.com/docs/rate-limits',
          source_type: 'official',
          claim_type: 'fact',
        },
      ],
    });

    expect(intro.best_for).toContain('200k token context windows');
    expect(intro.not_for).toContain('60 requests/min');
  });
});
