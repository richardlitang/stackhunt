import { describe, expect, it } from 'vitest';

import {
  resolveToolCompareGridValue,
  type ToolCompareGridLike,
} from '@/lib/tool-page/alternatives-compare-grid';

const baseTool: ToolCompareGridLike = {
  name: 'Attio',
  pricing_type: 'freemium',
  learning_curve: 'medium',
  curatedVerdict: null,
  computedDiff: null,
};

describe('resolveToolCompareGridValue', () => {
  it('returns explicit confirmation-needed states when source-backed values are missing', () => {
    const tool: ToolCompareGridLike = {
      ...baseTool,
      pricing_type: null,
      learning_curve: null,
    };

    expect(resolveToolCompareGridValue('Setup time', tool)).toBe('Needs confirmation');
    expect(resolveToolCompareGridValue('Seat complexity', tool)).toBe('Needs confirmation');
    expect(resolveToolCompareGridValue('Customization depth', tool)).toBe('Needs confirmation');
  });

  it('uses curated verdict signals where available', () => {
    const tool: ToolCompareGridLike = {
      ...baseTool,
      curatedVerdict: 'you need enterprise governance controls',
    };

    expect(resolveToolCompareGridValue('Customization depth', tool)).toBe(
      'Comparison brief available'
    );
    expect(resolveToolCompareGridValue('Best for', tool)).toBe(
      'Teams matching the comparison brief assumptions'
    );
    expect(resolveToolCompareGridValue('Rationale source', tool)).toBe('Comparison brief');
  });

  it('uses computed diff as heuristic for integration approach and evidence level', () => {
    const tool: ToolCompareGridLike = {
      ...baseTool,
      computedDiff: { featureDiff: 'API-first integration focus' },
    };

    expect(resolveToolCompareGridValue('Integration approach', tool)).toBe(
      'API-first integration focus'
    );
    expect(resolveToolCompareGridValue('Evidence level', tool)).toBe('Heuristic');
  });
});
