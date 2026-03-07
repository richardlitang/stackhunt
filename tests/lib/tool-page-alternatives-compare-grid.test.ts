import { describe, expect, it } from 'vitest';

import {
  deriveVisibleToolCompareGridRows,
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
    expect(resolveToolCompareGridValue('Choose this instead if', tool)).toBe('Needs confirmation');
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
    expect(resolveToolCompareGridValue('Choose this instead if', tool)).toContain('Choose');
    expect(resolveToolCompareGridValue('Rationale source', tool)).toBe('Comparison brief');
    expect(resolveToolCompareGridCell('Best for', tool).evidenceTag).toBe('source');
    expect(resolveToolCompareGridCell('Choose this instead if', tool).evidenceTag).toBe('source');
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
    expect(resolveToolCompareGridValue('Choose this instead if', tool)).toContain('Choose');
    expect(resolveToolCompareGridValue('Evidence level', tool)).toBe('Heuristic');
    expect(resolveToolCompareGridCell('Setup time', tool).evidenceTag).toBe('heuristic');
    expect(resolveToolCompareGridCell('Choose this instead if', tool).evidenceTag).toBe(
      'heuristic'
    );
  });

  it('uses lens-aware fallback copy when evidence is pending', () => {
    const tool: ToolCompareGridLike = {
      ...baseTool,
      curatedVerdict: null,
      computedDiff: null,
    };

    expect(resolveToolCompareGridValue('Best for', tool, 'enterprise')).toContain('governance');
    expect(resolveToolCompareGridValue('Integration approach', tool, 'startup')).toContain(
      'workflow'
    );
    expect(resolveToolCompareGridCell('Best for', tool, 'enterprise').evidenceTag).toBe('pending');
  });

  it('suppresses rows when all cells are pending', () => {
    const main: ToolCompareGridLike = {
      name: 'MainTool',
      pricing_type: null,
      learning_curve: null,
      curatedVerdict: null,
      computedDiff: null,
    };
    const alternatives: ToolCompareGridLike[] = [
      {
        name: 'AltA',
        pricing_type: null,
        learning_curve: null,
        curatedVerdict: null,
        computedDiff: null,
      },
      {
        name: 'AltB',
        pricing_type: null,
        learning_curve: null,
        curatedVerdict: null,
        computedDiff: null,
      },
    ];

    const rows = deriveVisibleToolCompareGridRows(main, alternatives, 'general');
    expect(rows).toEqual([]);
  });

  it('retains source-backed rows when at least one cell has source evidence', () => {
    const main: ToolCompareGridLike = {
      name: 'MainTool',
      pricing_type: 'freemium',
      learning_curve: 'easy',
      curatedVerdict: null,
      computedDiff: null,
    };
    const alternatives: ToolCompareGridLike[] = [
      {
        name: 'AltA',
        pricing_type: null,
        learning_curve: null,
        curatedVerdict: null,
        computedDiff: null,
      },
    ];

    const rows = deriveVisibleToolCompareGridRows(main, alternatives, 'general');
    expect(rows).toContain('Setup time');
    expect(rows).toContain('Seat complexity');
  });

  it('suppresses choose-this row when it is only heuristic with no source-backed cell', () => {
    const main: ToolCompareGridLike = {
      name: 'MainTool',
      pricing_type: null,
      learning_curve: null,
      curatedVerdict: null,
      computedDiff: {
        featureDiff: 'API-first',
        priceDiff: 'Higher unit cost',
        learningDiff: 'Slower onboarding',
      },
    };
    const alternatives: ToolCompareGridLike[] = [
      {
        name: 'AltA',
        pricing_type: null,
        learning_curve: null,
        curatedVerdict: null,
        computedDiff: {
          featureDiff: 'Native integrations',
          priceDiff: 'Lower unit cost',
          learningDiff: 'Faster onboarding',
        },
      },
    ];

    const rows = deriveVisibleToolCompareGridRows(main, alternatives, 'general');
    expect(rows).not.toContain('Choose this instead if');
    expect(rows).toContain('Evidence level');
  });

  it('suppresses heuristic rows when every cell resolves to the same generic value', () => {
    const main: ToolCompareGridLike = {
      name: 'MainTool',
      pricing_type: null,
      learning_curve: null,
      curatedVerdict: null,
      computedDiff: {
        featureDiff: 'Model signal only, verify in docs',
      },
    };
    const alternatives: ToolCompareGridLike[] = [
      {
        name: 'AltA',
        pricing_type: null,
        learning_curve: null,
        curatedVerdict: null,
        computedDiff: {
          featureDiff: 'Model signal only, verify in docs',
        },
      },
    ];

    const rows = deriveVisibleToolCompareGridRows(main, alternatives, 'general');
    expect(rows).not.toContain('Customization depth');
  });
});
