import {
  labelAlternativeEvidenceLevelForGrid,
  resolveAlternativeEvidenceLevel,
} from '@/lib/tool-page/alternative-evidence';
import { buildAlternativeRationaleSourceLabel } from '@/lib/tool-page/alternative-rationale';

export interface ToolCompareGridLike {
  name: string;
  slug?: string;
  pricing_type?: string | null;
  learning_curve?: string | null;
  curatedVerdict?: string | null;
  computedDiff?: {
    priceDiff?: string;
    learningDiff?: string;
    featureDiff?: string;
  } | null;
}

export const TOOL_COMPARE_GRID_ROWS = [
  'Setup time',
  'Seat complexity',
  'Customization depth',
  'Integration approach',
  'Best for',
  'Evidence level',
  'Rationale source',
] as const;

export type ToolCompareGridRow = (typeof TOOL_COMPARE_GRID_ROWS)[number];

function normalizePricingType(type?: string | null): string {
  const value = (type || '').toLowerCase();
  if (!value) return 'Needs confirmation';
  if (value.includes('free')) return 'Lower seat friction';
  if (value.includes('enterprise')) return 'Procurement-heavy';
  if (value.includes('tier')) return 'Tier and seat dependent';
  if (value.includes('usage')) return 'Usage-sensitive';
  return 'Plan dependent';
}

function normalizeSetup(curve?: string | null): string {
  const value = (curve || '').toLowerCase();
  if (!value) return 'Needs confirmation';
  if (value.includes('easy') || value.includes('low')) return 'Faster';
  if (value.includes('steep') || value.includes('high')) return 'Heavier';
  return 'Medium';
}

export function resolveToolCompareGridValue(
  row: ToolCompareGridRow,
  tool: ToolCompareGridLike
): string {
  switch (row) {
    case 'Setup time':
      return normalizeSetup(tool.learning_curve);
    case 'Seat complexity':
      return normalizePricingType(tool.pricing_type);
    case 'Customization depth':
      if (tool.curatedVerdict) return 'Comparison brief available';
      if (tool.computedDiff?.featureDiff) return 'Model signal only, verify in docs';
      return 'Needs confirmation';
    case 'Integration approach':
      if (tool.computedDiff?.featureDiff) return tool.computedDiff.featureDiff;
      return 'Needs confirmation';
    case 'Best for':
      if (tool.curatedVerdict) return 'Teams matching the comparison brief assumptions';
      return 'Needs confirmation';
    case 'Evidence level': {
      const level = resolveAlternativeEvidenceLevel({
        curatedVerdict: tool.curatedVerdict,
        computedDiff: tool.computedDiff,
      });
      return labelAlternativeEvidenceLevelForGrid(level);
    }
    case 'Rationale source':
      return buildAlternativeRationaleSourceLabel(tool.curatedVerdict);
    default:
      return 'Needs confirmation';
  }
}
