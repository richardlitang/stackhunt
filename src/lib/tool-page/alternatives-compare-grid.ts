import {
  labelAlternativeEvidenceLevelForGrid,
  resolveAlternativeEvidenceLevel,
} from '@/lib/tool-page/alternative-evidence';
import {
  buildAlternativeChooseLine,
  buildAlternativeRationaleSourceLabel,
} from '@/lib/tool-page/alternative-rationale';
import type { ReviewLens } from '@/lib/tool-page/view-model';

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
  'Choose this instead if',
  'Evidence level',
  'Rationale source',
] as const;

export type ToolCompareGridRow = (typeof TOOL_COMPARE_GRID_ROWS)[number];
export type ToolCompareGridEvidenceTag = 'source' | 'heuristic' | 'pending';

export interface ToolCompareGridCell {
  value: string;
  evidenceTag: ToolCompareGridEvidenceTag;
}

const ROWS_ALLOWING_HEURISTIC_ONLY = new Set<ToolCompareGridRow>(['Evidence level']);
const PENDING_VALUE = '-';

function toSentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function normalizePricingType(type?: string | null): string {
  const value = (type || '').toLowerCase();
  if (!value) return PENDING_VALUE;
  if (value.includes('free')) return 'Lower seat friction';
  if (value.includes('enterprise')) return 'Procurement-heavy';
  if (value.includes('tier')) return 'Tier and seat dependent';
  if (value.includes('usage')) return 'Usage-sensitive';
  return 'Plan dependent';
}

function normalizeSetup(curve?: string | null): string {
  const value = (curve || '').toLowerCase();
  if (!value) return PENDING_VALUE;
  if (value.includes('easy') || value.includes('low')) return 'Faster';
  if (value.includes('steep') || value.includes('high')) return 'Heavier';
  return 'Medium';
}

function lensFallbackForBestFor(lens: ReviewLens): string {
  if (lens === 'personal') return 'Solo operators prioritizing low seat friction';
  if (lens === 'startup') return 'Teams prioritizing rollout speed and pipeline control';
  if (lens === 'enterprise') return 'Teams prioritizing governance and cross-team controls';
  return PENDING_VALUE;
}

function lensFallbackForIntegrationApproach(lens: ReviewLens): string {
  if (lens === 'personal') return 'Automation-first integrations, verify native depth';
  if (lens === 'startup') return 'API and workflow integrations for team handoffs';
  if (lens === 'enterprise')
    return 'Identity and governance integrations, verify in procurement docs';
  return PENDING_VALUE;
}

export function resolveToolCompareGridValue(
  row: ToolCompareGridRow,
  tool: ToolCompareGridLike,
  activeReviewLens: ReviewLens = 'general'
): string {
  return resolveToolCompareGridCell(row, tool, activeReviewLens).value;
}

export function resolveToolCompareGridCell(
  row: ToolCompareGridRow,
  tool: ToolCompareGridLike,
  activeReviewLens: ReviewLens = 'general'
): ToolCompareGridCell {
  switch (row) {
    case 'Setup time':
      if (tool.computedDiff?.learningDiff) {
        return { value: toSentenceCase(tool.computedDiff.learningDiff), evidenceTag: 'heuristic' };
      }
      return {
        value: normalizeSetup(tool.learning_curve),
        evidenceTag: tool.learning_curve ? 'source' : 'pending',
      };
    case 'Seat complexity':
      if (tool.computedDiff?.priceDiff) {
        return { value: toSentenceCase(tool.computedDiff.priceDiff), evidenceTag: 'heuristic' };
      }
      return {
        value: normalizePricingType(tool.pricing_type),
        evidenceTag: tool.pricing_type ? 'source' : 'pending',
      };
    case 'Customization depth':
      if (tool.curatedVerdict)
        return { value: 'Comparison brief available', evidenceTag: 'source' };
      if (tool.computedDiff?.featureDiff) {
        return { value: 'Model signal only, verify in docs', evidenceTag: 'heuristic' };
      }
      return { value: PENDING_VALUE, evidenceTag: 'pending' };
    case 'Integration approach':
      return {
        value: lensFallbackForIntegrationApproach(activeReviewLens),
        evidenceTag: 'pending',
      };
    case 'Best for':
      if (tool.curatedVerdict) {
        return { value: 'Teams matching the comparison brief assumptions', evidenceTag: 'source' };
      }
      return { value: lensFallbackForBestFor(activeReviewLens), evidenceTag: 'pending' };
    case 'Choose this instead if': {
      if (tool.curatedVerdict) {
        return {
          value: buildAlternativeChooseLine({
            altName: tool.name,
            mainName: 'the reviewed tool',
            curatedVerdict: tool.curatedVerdict || null,
            computedDiff: tool.computedDiff || null,
          }),
          evidenceTag: 'source',
        };
      }
      return { value: PENDING_VALUE, evidenceTag: 'pending' };
    }
    case 'Evidence level': {
      const level = resolveAlternativeEvidenceLevel({
        curatedVerdict: tool.curatedVerdict,
        computedDiff: tool.computedDiff,
      });
      return {
        value: labelAlternativeEvidenceLevelForGrid(level),
        evidenceTag:
          level === 'evidence_backed'
            ? 'source'
            : level === 'model_derived'
              ? 'heuristic'
              : 'pending',
      };
    }
    case 'Rationale source': {
      const label = buildAlternativeRationaleSourceLabel(tool.curatedVerdict);
      return {
        value: label,
        evidenceTag: label === 'Comparison brief' ? 'source' : 'pending',
      };
    }
    default:
      return { value: PENDING_VALUE, evidenceTag: 'pending' };
  }
}

export function deriveVisibleToolCompareGridRows(
  main: ToolCompareGridLike,
  alternatives: ToolCompareGridLike[],
  activeReviewLens: ReviewLens = 'general'
): ToolCompareGridRow[] {
  const comparisonAlternatives = alternatives.slice(0, 2);
  return TOOL_COMPARE_GRID_ROWS.filter((row) => {
    const cells = [
      resolveToolCompareGridCell(row, main, activeReviewLens),
      ...comparisonAlternatives.map((alt) =>
        resolveToolCompareGridCell(row, alt, activeReviewLens)
      ),
    ];
    const normalizedValues = cells
      .map((cell) => cell.value.toLowerCase().replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const hasValueVariance = normalizedValues.length > 1 && new Set(normalizedValues).size > 1;
    const hasSource = cells.some((cell) => cell.evidenceTag === 'source');
    const hasNonPending = cells.some((cell) => cell.evidenceTag !== 'pending');
    if (!hasNonPending) return false;
    if (!hasSource && !hasValueVariance && !ROWS_ALLOWING_HEURISTIC_ONLY.has(row)) return false;
    if (hasSource) return true;
    return ROWS_ALLOWING_HEURISTIC_ONLY.has(row);
  });
}
