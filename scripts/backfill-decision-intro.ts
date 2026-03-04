#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  buildDecisionSlots,
  generateDecisionEvidence,
  generateDecisionIntro,
  type ClaimEvidenceLike,
} from '../src/lib/tool-page-intro.js';

dotenv.config();

type ReviewRow = {
  id: string;
  item_id: string;
  status: string;
  updated_at: string;
  created_at: string;
  pros: unknown;
  cons: unknown;
  item: {
    id: string;
    name: string;
    short_description: string | null;
    review_context: Record<string, unknown> | null;
  } | null;
};

const GENERIC_NARRATIVE_PATTERNS = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities?\b/i,
  /\bgreat for teams?\b/i,
  /\bclear tool guidance\b/i,
  /\bsoftware buying decision\b/i,
];

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return null;
  return match.split('=').slice(1).join('=').trim();
}

function isMeaningfulDecisionLine(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 24) return false;
  return !GENERIC_NARRATIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isMeaningfulSlotLine(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 12) return false;
  return !GENERIC_NARRATIVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function extractClaimTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).text === 'string') {
        return ((entry as Record<string, unknown>).text as string).trim();
      }
      return '';
    })
    .filter((text) => text.length > 0);
}

function extractClaimEvidence(raw: unknown): ClaimEvidenceLike[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const text = typeof record.text === 'string' ? record.text : null;
      if (!text || text.trim().length < 8) return null;
      return {
        text,
        source_url:
          typeof record.source_url === 'string'
            ? record.source_url
            : typeof record.source === 'string'
              ? record.source
              : null,
        source_type: typeof record.source_type === 'string' ? record.source_type : null,
        claim_type: typeof record.claim_type === 'string' ? record.claim_type : null,
      } as ClaimEvidenceLike;
    })
    .filter((entry): entry is ClaimEvidenceLike => Boolean(entry));
}

function hasDecisionIntroCoverage(reviewContext: Record<string, unknown> | null): boolean {
  if (!reviewContext) return false;
  const current =
    (reviewContext.decisionIntro as Record<string, unknown> | undefined) ||
    (reviewContext.decision_intro as Record<string, unknown> | undefined);
  if (!current) return false;
  return (
    isMeaningfulDecisionLine(current.what_it_is) &&
    isMeaningfulDecisionLine(current.best_for) &&
    isMeaningfulDecisionLine(current.not_for) &&
    isMeaningfulDecisionLine(current.main_tradeoff)
  );
}

function hasDecisionIntroShapeConsistency(reviewContext: Record<string, unknown> | null): boolean {
  if (!reviewContext) return false;
  const camel = reviewContext.decisionIntro;
  const snake = reviewContext.decision_intro;
  const hasCamel = Boolean(camel && typeof camel === 'object');
  const hasSnake = Boolean(snake && typeof snake === 'object');
  if (!hasCamel || !hasSnake) return false;
  return stableStringify(camel) === stableStringify(snake);
}

function hasDecisionEvidenceShapeConsistency(reviewContext: Record<string, unknown> | null): boolean {
  if (!reviewContext) return false;
  const camel = reviewContext.decisionEvidence;
  const snake = reviewContext.decision_evidence;
  const hasCamel = Boolean(camel && typeof camel === 'object');
  const hasSnake = Boolean(snake && typeof snake === 'object');
  if (!hasCamel || !hasSnake) return false;
  return stableStringify(camel) === stableStringify(snake);
}

function hasDecisionSlotsShapeConsistency(reviewContext: Record<string, unknown> | null): boolean {
  if (!reviewContext) return false;
  const camel = reviewContext.decisionSlots;
  const snake = reviewContext.decision_slots;
  const hasCamel = Boolean(camel && typeof camel === 'object');
  const hasSnake = Boolean(snake && typeof snake === 'object');
  if (!hasCamel || !hasSnake) return false;
  return stableStringify(camel) === stableStringify(snake);
}

function hasDecisionSlotsCoverage(reviewContext: Record<string, unknown> | null): boolean {
  if (!reviewContext) return false;
  const current =
    (reviewContext.decisionSlots as Record<string, unknown> | undefined) ||
    (reviewContext.decision_slots as Record<string, unknown> | undefined);
  if (!current) return false;
  return (
    isMeaningfulDecisionLine(current.what_it_is) &&
    isMeaningfulSlotLine(current.best_fit) &&
    isMeaningfulSlotLine(current.weak_fit) &&
    isMeaningfulSlotLine(current.tradeoff)
  );
}

function isDecisionEvidenceMeaningful(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const keys = ['best_for_reason', 'not_for_reason', 'tradeoff_reason'];
  return keys.some((key) => {
    const entry = record[key];
    return (
      entry &&
      typeof entry === 'object' &&
      typeof (entry as Record<string, unknown>).text === 'string' &&
      ((entry as Record<string, unknown>).text as string).trim().length >= 12
    );
  });
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(record[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(sortValue(value));
  } catch {
    return '';
  }
}

async function main() {
  const apply = hasFlag('apply');
  const verbose = hasFlag('verbose');
  const includeDraft = hasFlag('include-draft');
  const includeReview = hasFlag('include-review');
  const limitArg = Number(getArgValue('limit') || 500);
  const pageSizeArg = Number(getArgValue('page-size') || 250);

  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 5000)) : 500;
  const pageSize = Number.isFinite(pageSizeArg)
    ? Math.max(50, Math.min(pageSizeArg, 1000))
    : 250;

  const statuses = ['published', ...(includeReview ? ['review'] : []), ...(includeDraft ? ['draft'] : [])];

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const latestByItem = new Map<string, ReviewRow>();

  let from = 0;
  while (latestByItem.size < limit) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('reviews')
      .select(
        `
          id,
          item_id,
          status,
          updated_at,
          created_at,
          pros,
          cons,
          item:items!inner(id, name, short_description, review_context)
        `
      )
      .in('status', statuses)
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error(`Failed to load reviews: ${error.message}`);
      process.exit(1);
    }

    const rows = (data || []) as ReviewRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!row.item || latestByItem.has(row.item_id)) continue;
      latestByItem.set(row.item_id, row);
      if (latestByItem.size >= limit) break;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const candidates = Array.from(latestByItem.values());
  let needsBackfill = 0;
  let applied = 0;
  let failed = 0;
  const reasonCounts = {
    content: 0,
    intro_shape: 0,
    evidence_shape: 0,
    slots_content: 0,
    slots_shape: 0,
  };

  console.log('\nDecision Intro + Slots Backfill');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Statuses: ${statuses.join(', ')}`);
  console.log(`Candidate items scanned: ${candidates.length}`);

  for (const row of candidates) {
    if (!row.item) continue;
    const existingContext =
      row.item.review_context && typeof row.item.review_context === 'object'
        ? ({ ...row.item.review_context } as Record<string, unknown>)
        : ({} as Record<string, unknown>);

    const hasCoverage = hasDecisionIntroCoverage(existingContext);
    const hasIntroShape = hasDecisionIntroShapeConsistency(existingContext);
    const hasEvidenceShape = hasDecisionEvidenceShapeConsistency(existingContext);
    const hasSlotsCoverage = hasDecisionSlotsCoverage(existingContext);
    const hasSlotsShape = hasDecisionSlotsShapeConsistency(existingContext);
    const needsContentBackfill = !hasCoverage;
    const needsShapeBackfill = !hasIntroShape || !hasEvidenceShape || !hasSlotsShape;
    const needsSlotsContentBackfill = !hasSlotsCoverage;

    if (!needsContentBackfill && !needsShapeBackfill && !needsSlotsContentBackfill) continue;

    const reasons: string[] = [];
    if (needsContentBackfill) {
      reasons.push('content');
      reasonCounts.content += 1;
    }
    if (!hasIntroShape) {
      reasons.push('intro_shape');
      reasonCounts.intro_shape += 1;
    }
    if (!hasEvidenceShape) {
      reasons.push('evidence_shape');
      reasonCounts.evidence_shape += 1;
    }
    if (needsSlotsContentBackfill) {
      reasons.push('slots_content');
      reasonCounts.slots_content += 1;
    }
    if (!hasSlotsShape) {
      reasons.push('slots_shape');
      reasonCounts.slots_shape += 1;
    }

    const pros = extractClaimTexts(row.pros);
    const cons = extractClaimTexts(row.cons);
    const proClaims = extractClaimEvidence(row.pros);
    const conClaims = extractClaimEvidence(row.cons);

    const existingDecisionIntro =
      (existingContext.decisionIntro as Record<string, unknown> | undefined) ||
      (existingContext.decision_intro as Record<string, unknown> | undefined);
    const generatedDecisionIntro = generateDecisionIntro({
      toolName: row.item.name,
      shortDescription: row.item.short_description,
      pros,
      cons,
      proClaims,
      conClaims,
    });
    const canonicalDecisionIntro =
      hasCoverage && existingDecisionIntro ? existingDecisionIntro : generatedDecisionIntro;
    const generatedDecisionEvidence = generateDecisionEvidence(proClaims, conClaims);
    const existingDecisionEvidence =
      (existingContext.decisionEvidence as Record<string, unknown> | undefined) ||
      (existingContext.decision_evidence as Record<string, unknown> | undefined);
    const canonicalDecisionEvidence =
      isDecisionEvidenceMeaningful(existingDecisionEvidence)
        ? existingDecisionEvidence
        : generatedDecisionEvidence;
    const existingDecisionSlots =
      (existingContext.decisionSlots as Record<string, unknown> | undefined) ||
      (existingContext.decision_slots as Record<string, unknown> | undefined);
    const generatedDecisionSlots = buildDecisionSlots({
      toolName: row.item.name,
      shortDescription: row.item.short_description,
      pros,
      cons,
      proClaims,
      conClaims,
      decisionIntro: canonicalDecisionIntro as {
        what_it_is?: string;
        best_for?: string;
        not_for?: string;
        main_tradeoff?: string;
        summary?: string;
      },
    });
    const canonicalDecisionSlots =
      hasDecisionSlotsCoverage(existingContext) && existingDecisionSlots
        ? existingDecisionSlots
        : generatedDecisionSlots;

    const mergedContext = {
      ...existingContext,
      decisionIntro: canonicalDecisionIntro,
      decision_intro: canonicalDecisionIntro,
      decisionEvidence: canonicalDecisionEvidence,
      decision_evidence: canonicalDecisionEvidence,
      decisionSlots: canonicalDecisionSlots,
      decision_slots: canonicalDecisionSlots,
    };

    needsBackfill += 1;
    if (verbose) {
      console.log(`- ${row.item.name}: ${reasons.join(', ')}`);
    }

    if (!apply) continue;

    const { error: updateError } = await supabase
      .from('items')
      .update({ review_context: mergedContext })
      .eq('id', row.item.id);

    if (updateError) {
      failed += 1;
      console.error(`Failed to update ${row.item.name} (${row.item.id}): ${updateError.message}`);
      continue;
    }

    applied += 1;
  }

  console.log(`Needs backfill: ${needsBackfill}`);
  console.log(
    `Reasons: content=${reasonCounts.content}, intro_shape=${reasonCounts.intro_shape}, evidence_shape=${reasonCounts.evidence_shape}, slots_content=${reasonCounts.slots_content}, slots_shape=${reasonCounts.slots_shape}`
  );
  if (apply) {
    console.log(`Applied: ${applied}`);
    console.log(`Failed: ${failed}`);
  } else {
    console.log('No updates applied. Re-run with --apply to persist updates.');
  }

  if (apply && failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
