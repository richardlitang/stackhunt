import { describe, expect, it } from 'vitest';

import {
  formatAlternativeEvidenceDate,
  labelAlternativeEvidenceLevel,
  labelAlternativeEvidenceLevelForGrid,
  resolveAlternativeEvidenceLevel,
} from '@/lib/tool-page/alternatives/alternative-evidence';

describe('resolveAlternativeEvidenceLevel', () => {
  it('prefers source-backed status when curated verdict exists', () => {
    const level = resolveAlternativeEvidenceLevel({
      curatedVerdict: 'Better enterprise controls',
      computedDiff: { learningDiff: 'Easier to learn' },
    });
    expect(level).toBe('evidence_backed');
  });

  it('returns model-derived status for computed signals without curated verdict', () => {
    const level = resolveAlternativeEvidenceLevel({
      curatedVerdict: null,
      computedDiff: { priceDiff: 'Free vs paid' },
    });
    expect(level).toBe('model_derived');
  });

  it('returns pending status when no signals exist', () => {
    const level = resolveAlternativeEvidenceLevel({
      curatedVerdict: null,
      computedDiff: null,
    });
    expect(level).toBe('needs_confirmation');
  });
});

describe('alternative evidence labels', () => {
  it('maps evidence levels to card and grid labels', () => {
    expect(labelAlternativeEvidenceLevel('evidence_backed')).toBe('Evidence-backed rationale');
    expect(labelAlternativeEvidenceLevel('model_derived')).toBe(
      'Model-derived signal, verify in docs'
    );
    expect(labelAlternativeEvidenceLevel('needs_confirmation')).toBe('Needs confirmation');

    expect(labelAlternativeEvidenceLevelForGrid('evidence_backed')).toBe('Source-backed');
    expect(labelAlternativeEvidenceLevelForGrid('model_derived')).toBe('Heuristic');
    expect(labelAlternativeEvidenceLevelForGrid('needs_confirmation')).toBe('Pending verification');
  });
});

describe('formatAlternativeEvidenceDate', () => {
  it('returns formatted date for valid ISO input', () => {
    expect(formatAlternativeEvidenceDate('2026-03-06T00:00:00.000Z')).toBe('Mar 6, 2026');
  });

  it('returns null for missing or invalid input', () => {
    expect(formatAlternativeEvidenceDate(null)).toBeNull();
    expect(formatAlternativeEvidenceDate('invalid-date')).toBeNull();
  });
});
