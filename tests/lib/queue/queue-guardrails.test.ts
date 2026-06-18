import { describe, expect, it } from 'vitest';
import { getAvailableSourceSlots, parseQueueCap } from '../../../scripts/lib/queue-guardrails.js';

describe('queue guardrails', () => {
  it('parseQueueCap falls back on invalid input', () => {
    expect(parseQueueCap(undefined, 50)).toBe(50);
    expect(parseQueueCap('abc', 50)).toBe(50);
    expect(parseQueueCap('0', 50)).toBe(50);
    expect(parseQueueCap('-5', 50)).toBe(50);
  });

  it('parseQueueCap accepts positive numeric input', () => {
    expect(parseQueueCap('100', 50)).toBe(100);
    expect(parseQueueCap('12.8', 50)).toBe(12);
  });

  it('getAvailableSourceSlots returns remaining capacity', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ count: 37, error: null }),
          }),
        }),
      }),
    } as any;

    const result = await getAvailableSourceSlots(mockSupabase, 'scheduled', 50);
    expect(result).toEqual({ current: 37, remaining: 13 });
  });

  it('getAvailableSourceSlots throws on query error', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ count: null, error: { message: 'boom' } }),
          }),
        }),
      }),
    } as any;

    await expect(getAvailableSourceSlots(mockSupabase, 'scheduled', 50)).rejects.toThrow(
      'Failed to inspect queue guardrails: boom'
    );
  });
});
