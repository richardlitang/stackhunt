import { describe, expect, it } from 'vitest';
import {
  markInsufficientSources,
  markResearchBudgetCapped,
  markPriceOnly,
  markBatchDeferred,
  markDuplicateReuse,
} from '@/lib/hunter/hunt-transitions';
import type { HunterContext } from '@/lib/hunter/types';

function ctx(): HunterContext {
  return {
    toolName: 'Acme',
    huntType: 'full',
    skipAnalysis: false,
    skipPersistence: false,
    skipSynthesis: false,
    startTime: Date.now(),
    tokensUsed: 0,
    logs: [],
  } as HunterContext;
}

describe('hunt-transitions', () => {
  it('markInsufficientSources sets all three research-only flags', () => {
    const c = ctx();
    markInsufficientSources(c);
    expect(c.skipAnalysis).toBe(true);
    expect(c.skipSynthesis).toBe(true);
    expect(c.insufficientSources).toBe(true);
  });

  it('markResearchBudgetCapped stops at synthesis without flagging analysis directly', () => {
    const c = ctx();
    markResearchBudgetCapped(c);
    expect(c.skipSynthesis).toBe(true);
    expect(c.skipAnalysis).toBe(false);
    expect(c.insufficientSources).toBeUndefined();
  });

  it('markPriceOnly / markBatchDeferred / markDuplicateReuse skip analysis only', () => {
    for (const transition of [markPriceOnly, markBatchDeferred, markDuplicateReuse]) {
      const c = ctx();
      transition(c);
      expect(c.skipAnalysis).toBe(true);
      expect(c.skipSynthesis).toBe(false);
      expect(c.insufficientSources).toBeUndefined();
    }
  });
});
