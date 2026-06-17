/**
 * Named phase-skip transitions for the hunt pipeline.
 *
 * The orchestrator decides at several points to skip the analysis and/or
 * synthesis phases. These helpers name each decision after the domain event
 * that triggers it and keep the related skip flags consistent in one place,
 * instead of scattering boolean assignments across hunt()'s nested branches.
 *
 * @module hunter/hunt-transitions
 */
import type { HunterContext } from './types';

/**
 * Not enough source material to justify analysis. Persist research only:
 * skip both analysis and synthesis, and flag the research-only persistence
 * path. This is the one transition that must keep three flags consistent.
 */
export function markInsufficientSources(ctx: HunterContext): void {
  ctx.skipAnalysis = true;
  ctx.skipSynthesis = true;
  ctx.insufficientSources = true;
}

/**
 * Token budget reached during/after research. Stop before synthesis and
 * persist whatever research exists. The two-stage branch later resolves
 * `skipSynthesis` into `skipAnalysis`.
 */
export function markResearchBudgetCapped(ctx: HunterContext): void {
  ctx.skipSynthesis = true;
}

/** `price_only` hunt: refresh pricing only, no analysis. */
export function markPriceOnly(ctx: HunterContext): void {
  ctx.skipAnalysis = true;
}

/** Batch two-stage pipeline: research now, synthesis deferred to a later batch. */
export function markBatchDeferred(ctx: HunterContext): void {
  ctx.skipAnalysis = true;
}

/** Hard duplicate on a queued hunt: reuse the existing tool, skip analysis. */
export function markDuplicateReuse(ctx: HunterContext): void {
  ctx.skipAnalysis = true;
}
