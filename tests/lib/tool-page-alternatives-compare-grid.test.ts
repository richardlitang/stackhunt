import { describe, expect, it } from 'vitest';

import {
  resolveToolCompareGridCell,
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
    expect(resolveToolCompareGridCell('Setup time', tool).evidenceTag).toBe('pending');
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
    expect(resolveToolCompareGridCell('Best for', tool).evidenceTag).toBe('source');
  });

  it('uses computed diff as heuristic for integration approach and evidence level', () => {
    const tool: ToolCompareGridLike = {
      ...baseTool,
      computedDiff: {
        featureDiff: 'API-first integration focus',
        priceDiff: 'attio has a free tier',
        learningDiff: 'attio is easier to learn (~Hours)',
      },
    };

    expect(resolveToolCompareGridValue('Integration approach', tool)).toBe(
      'API-first integration focus'
    );
    expect(resolveToolCompareGridValue('Setup time', tool)).toBe(
      'Attio is easier to learn (~Hours)'
    );
    expect(resolveToolCompareGridValue('Seat complexity', tool)).toBe('Attio has a free tier');
    expect(resolveToolCompareGridValue('Best for', tool)).toBe(
      'Teams optimizing for feature and integration fit'
    );
    expect(resolveToolCompareGridValue('Evidence level', tool)).toBe('Heuristic');
    expect(resolveToolCompareGridCell('Setup time', tool).evidenceTag).toBe('heuristic');
  });
});
