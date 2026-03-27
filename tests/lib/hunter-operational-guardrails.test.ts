import { describe, expect, it } from 'vitest';
import {
  isObjectiveOperationalText,
  isRiskyOperationalNarrative,
  sanitizeOperationalRecord,
} from '@/lib/hunter/operational-guardrails';

describe('hunter operational guardrails', () => {
  it('detects objective operational text and rejects subjective pricing copy', () => {
    expect(isObjectiveOperationalText('Upgrade at 10 seats for SSO and audit logs.')).toBe(true);
    expect(isObjectiveOperationalText('Great value for everyone.')).toBe(false);
    expect(isRiskyOperationalNarrative('3x faster than competitors')).toBe(true);
  });

  it('sanitizes nested operational records recursively', () => {
    const result = sanitizeOperationalRecord({
      summary: 'Great value for everyone.',
      thresholds: [
        'Upgrade at 10 seats for SSO and audit logs.',
        'Best value overall',
        {
          note: 'Annual contract required for enterprise tier.',
          fluff: 'Amazing product',
        },
      ],
      nested: {
        retain: 'API quota applies above 100k calls/month.',
        drop: 'Worth it for all teams',
      },
    });

    expect(result.summary).toBeUndefined();
    expect(result.thresholds).toEqual([
      'Upgrade at 10 seats for SSO and audit logs.',
      { note: 'Annual contract required for enterprise tier.' },
    ]);
    expect(result.nested).toEqual({
      retain: 'API quota applies above 100k calls/month.',
    });
  });
});

