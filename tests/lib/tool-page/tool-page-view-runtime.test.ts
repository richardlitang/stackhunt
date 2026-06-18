import { describe, expect, it } from 'vitest';
import { buildToolPageViewRuntime } from '@/lib/tool-page/runtime/view-runtime';

describe('tool page view runtime', () => {
  it('builds heading, labels, normalized meta title, and source aria label helper', () => {
    const result = buildToolPageViewRuntime({
      toolName: 'Acme',
      toolMeta: {
        title: 'Acme Review | StackHunt',
        description: 'Default description',
        canonical: 'https://stackhunt.io/tool/acme',
      },
      metaRuntimeMeta: {
        description: 'Runtime description',
        canonical: 'https://stackhunt.io/tools',
        noindex: true,
      },
    });

    expect(result.toolReviewHeading).toBe('Acme Review');
    expect(result.lensLabelMap.enterprise).toBe('Enterprise');
    expect(result.meta.title).toBe('Acme Review: Pricing, Tradeoffs, Best Fit | StackHunt');
    expect(result.meta.description).toBe(
      'Acme review with free-plan fit, paid-tier upgrade triggers, rollout risks, and alternatives for real team setups.'
    );
    expect(result.meta.noindex).toBe(true);
    expect(result.sourceAriaLabel('  Example\u200B source  ')).toContain(
      'Open source evidence for Example source'
    );
  });

  it('preserves a concise custom title when it is already focused', () => {
    const result = buildToolPageViewRuntime({
      toolName: 'Ramp',
      toolMeta: {
        title: 'Ramp Review: Free Plan and Upgrade Triggers | StackHunt',
        description: 'Default description',
        canonical: 'https://stackhunt.io/tool/ramp',
      },
      metaRuntimeMeta: {
        description: 'Runtime description',
        canonical: 'https://stackhunt.io/tool/ramp',
        noindex: false,
      },
    });

    expect(result.meta.title).toBe('Ramp Review: Free Plan and Upgrade Triggers | StackHunt');
  });

  it('keeps descriptive runtime descriptions that are already buyer-focused', () => {
    const result = buildToolPageViewRuntime({
      toolName: 'Ramp',
      toolMeta: {
        title: 'Ramp Review: Free Plan and Upgrade Triggers | StackHunt',
        description: 'Default description',
        canonical: 'https://stackhunt.io/tool/ramp',
      },
      metaRuntimeMeta: {
        description:
          'Ramp review for finance teams covering free-plan fit, paid-tier upgrade triggers, operational rollout risk, and alternatives.',
        canonical: 'https://stackhunt.io/tool/ramp',
        noindex: false,
      },
    });

    expect(result.meta.description).toBe(
      'Ramp review for finance teams covering free-plan fit, paid-tier upgrade triggers, operational rollout risk, and alternatives.'
    );
  });
});
