import { describe, expect, it } from 'vitest';
import {
  deriveLensTagsForConstraintText,
  deriveLensTagsForIntegration,
  deriveLensTagsFromText,
  mergeLensTags,
  normalizeLensTags,
} from '@/lib/pricing/lens-tags';

describe('pricing lens tags', () => {
  it('normalizes and sorts lens tags', () => {
    expect(normalizeLensTags(['startup', 'personal', 'startup', 'enterprise'])).toEqual([
      'personal',
      'startup',
      'enterprise',
    ]);
  });

  it('derives lens tags from text tokens', () => {
    expect(deriveLensTagsFromText('Free starter plan for solo founders and small teams')).toEqual([
      'personal',
      'startup',
    ]);
    expect(deriveLensTagsFromText('Includes SSO and audit logs')).toEqual(['enterprise']);
  });

  it('merges existing and inferred tags without duplicates', () => {
    expect(mergeLensTags(['startup'], ['personal', 'startup'])).toEqual(['personal', 'startup']);
  });

  it('derives enterprise integration tags for IT/admin systems', () => {
    expect(
      deriveLensTagsForIntegration({
        name: 'Okta',
        type: 'native',
        direction: 'bidirectional',
      })
    ).toContain('enterprise');
  });

  it('derives startup/personal integration tags for operator tools', () => {
    const tags = deriveLensTagsForIntegration({
      name: 'Zapier',
      type: 'zapier',
      direction: 'import',
    });
    expect(tags).toContain('personal');
    expect(tags).toContain('startup');
  });

  it('derives constraint tags using description and plan hints', () => {
    expect(
      deriveLensTagsForConstraintText({
        description: 'SSO requires enterprise plan',
        planName: 'Enterprise',
      })
    ).toEqual(['enterprise']);
  });
});
