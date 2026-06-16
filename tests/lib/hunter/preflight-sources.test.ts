import { describe, expect, it } from 'vitest';
import {
  scoutSourceCounts,
  passesSourcePreflight,
} from '@/lib/hunter/preflight-sources';
import type { RawSource } from '@/lib/hunter/types';

/**
 * Characterization tests: pin the behavior moved verbatim out of the
 * orchestrator's inline pre-flight check. Assert what the code does today.
 */

function source(overrides: Partial<RawSource>): RawSource {
  return {
    url: 'https://example.com',
    title: 't',
    snippet: 's',
    domain: 'example.com',
    retrieved_at: '2026-06-16T00:00:00.000Z',
    canonical_url: 'https://example.com',
    source_type: 'editorial',
    intent_tags: [],
    policy: {
      acquisition_mode: 'SCRAPE_ALLOWED',
      llm_ingestion_allowed: 'YES',
      display_mode: 'ATTRIBUTED_EXCERPT',
    },
    ...overrides,
  };
}

const blocked = (overrides: Partial<RawSource>): RawSource =>
  source({
    ...overrides,
    policy: {
      acquisition_mode: 'BLOCKED',
      llm_ingestion_allowed: 'NO',
      display_mode: 'NO_DISPLAY',
      ...(overrides.policy ?? {}),
    },
  });

describe('scoutSourceCounts (characterization)', () => {
  it('buckets eligible sources by lane and excludes non-eligible ones', () => {
    const counts = scoutSourceCounts([
      source({ source_type: 'official', intent_tags: ['pricing'] }),
      source({ source_type: 'docs' }),
      source({ source_type: 'community', intent_tags: ['reviews'] }),
      source({ intent_tags: ['reviews'] }),
      blocked({ source_type: 'official', intent_tags: ['reviews', 'pricing'] }),
    ]);
    // 4 eligible (the BLOCKED official is excluded everywhere)
    expect(counts.eligible).toBe(4);
    expect(counts.official).toBe(2); // official + docs
    expect(counts.review).toBe(2); // community-reviews + editorial-reviews
    expect(counts.tribal).toBe(1); // community
    expect(counts.pricing).toBe(1); // official-pricing (blocked one excluded)
  });

  it('returns zeroes for empty input', () => {
    expect(scoutSourceCounts([])).toEqual({
      eligible: 0,
      review: 0,
      tribal: 0,
      official: 0,
      pricing: 0,
    });
  });
});

describe('passesSourcePreflight (characterization)', () => {
  it('contextual hunt needs 3 eligible + 1 official by default', () => {
    expect(passesSourcePreflight({ eligible: 3, official: 1 }, { hasContext: true })).toEqual({
      passed: true,
      minEligible: 3,
      minOfficial: 1,
    });
    expect(
      passesSourcePreflight({ eligible: 2, official: 1 }, { hasContext: true }).passed
    ).toBe(false);
  });

  it('discovery hunt needs 4 eligible by default', () => {
    expect(passesSourcePreflight({ eligible: 3, official: 1 }, { hasContext: false }).passed).toBe(
      false
    );
    expect(passesSourcePreflight({ eligible: 4, official: 1 }, { hasContext: false }).passed).toBe(
      true
    );
  });

  it('drops the eligible bar to 2 when at least 2 official sources are present', () => {
    const result = passesSourcePreflight({ eligible: 2, official: 2 }, { hasContext: false });
    expect(result.minEligible).toBe(2);
    expect(result.passed).toBe(true);
  });

  it('always fails with zero official sources regardless of eligible count', () => {
    expect(passesSourcePreflight({ eligible: 10, official: 0 }, { hasContext: true }).passed).toBe(
      false
    );
  });
});
