import { describe, expect, it } from 'vitest';
import { resolveFreshnessLine } from '@/lib/tool-page/freshness-line';

describe('resolveFreshnessLine', () => {
  it('formats a verified ISO date as the single freshness line', () => {
    expect(
      resolveFreshnessLine({
        lastCheckedISO: '2026-06-16T14:30:00.000Z',
        status: 'Source-backed',
      })
    ).toBe('Last verified Jun 16 2026');
  });

  it('returns null when no valid verification date exists', () => {
    expect(resolveFreshnessLine({ lastCheckedISO: null, status: 'Needs confirmation' })).toBeNull();
    expect(
      resolveFreshnessLine({ lastCheckedISO: 'Not confirmed', status: 'Pending verification' })
    ).toBeNull();
  });

  it('never emits hedge or confidence copy', () => {
    const line = resolveFreshnessLine({
      lastCheckedISO: '2026-06-16',
      status: 'Needs confirmation',
    });

    expect(line).toBe('Last verified Jun 16 2026');
    expect(line).not.toMatch(
      /pending|confidence|not confirmed|evaluation depth|needs confirmation/i
    );
  });
});
