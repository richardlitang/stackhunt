# Interview-Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Last verified: 2026-06-10

**Goal:** Close the five credibility gaps found in repo review: stale docs, the 5,334-line `persistence.ts` contradicting the "thin 3-phase pipeline" claim, no prompt versioning, no eval harness for LLM output, no adaptive research querying, and no persisted hunt cost telemetry.

**Architecture:** Five independently shippable phases. Phase 1 extracts pure-function domain modules out of `src/lib/hunter/phases/persistence.ts` (verbatim moves + characterization tests — no behavior change). Phases 2–5 build on the extracted modules: a prompt registry with hash-drift tests, an offline-capture/replay eval harness, research-time coverage-gap follow-up queries, and a `hunt_telemetry` table + cost report.

**Tech Stack:** TypeScript, Astro 5, Supabase (Postgres), Vitest, Gemini via `@google/genai`, Serper API, tsx scripts.

---

## Scope

- **In scope:** the 13 tasks below.
- **Out of scope:** Sentry/error-tracking vendor integration (record in `docs/plans/tech-debt.md` as follow-up); splitting `gemini.ts`/`serper.ts` services; extracting `createReview`/`persistResearchOnly`/`updatePricingOnly` from persistence (follow-up, see Task 6 step 4); any prompt-content changes.

## Conventions the executing agent must follow

- Repo rules live in `CLAUDE.md` (repo root). Key ones: read files before modifying; every Supabase list query needs `.limit()`; after any migration run `npm run types:db`; commit per logical unit with conventional-commit messages and `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Validation gate per task: `npm run typecheck && npm run test` (full `qa:prepush` once at the end of each phase).
- **Move rule for Phase 1:** moves are verbatim — copy the function/constant exactly, do not "improve" while moving. If a moved function references an unlisted private helper, move that helper too and export it only if persistence.ts still needs it. Let `tsc` drive completeness.
- When this plan is complete, move this file to `docs/plans/completed/` per `docs/plans/README.md`.

---

## Phase 0 — First impressions (docs cleanup)

### Task 1: Fix stale README

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Fix the AI-stack lie.** `README.md` currently says the automation layer is "OpenAI GPT-4o" (bullet list ~line 9 and the ASCII architecture diagram ~lines 33–35). The actual stack is Google Gemini 2.0 Flash (`@google/genai`, see `src/lib/hunter/services/gemini.ts` and `CLAUDE.md`). Replace the bullet:

```markdown
- **Automation**: Node.js + TypeScript + Google Gemini 2.0 Flash + Serper.dev
```

and replace the `│   OpenAI     │` / `│   GPT-4o     │` box in the diagram with:

```
│   Gemini     │
│   2.0 Flash  │
```

- [ ] **Step 2: Cross-check the rest of the README** against the Tech Stack table in `PRODUCT_SUMMARY.md` (lines ~20–35). Fix any other drift you find (hosting, captcha, DB claims). Read before editing.

- [ ] **Step 3: Add a pointer to the docs index.** At the end of the README's Architecture section add:

```markdown
See [`docs/index.md`](docs/index.md) for the full documentation index and [`PRODUCT_SUMMARY.md`](PRODUCT_SUMMARY.md) for the complete architecture.
```

- [ ] **Step 4: Verify and commit**

Run: `npm run format:check:changed` — expected: passes (run `npm run format` if not).

```bash
git add README.md
git commit -m "docs(readme): correct AI stack to Gemini 2.0 Flash and link docs index

README claimed OpenAI GPT-4o; the hunter pipeline has used Gemini since
the gemini service was introduced. First-impression accuracy fix.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2: Move scratch docs out of repo root

**Files:**

- Move: `APPLY_MIGRATION_030.md`, `CROSSOVER_CHART_READY.md`, `PARENT_CHILD_IMPLEMENTATION.md`, `DESIGN_AUDIT.md` → `docs/archive/`

- [ ] **Step 1: Check for inbound references** so links don't break:

Run: `grep -rn "APPLY_MIGRATION_030\|CROSSOVER_CHART_READY\|PARENT_CHILD_IMPLEMENTATION\|DESIGN_AUDIT" --include="*.md" --include="*.ts" --include="*.mjs" . --exclude-dir=node_modules --exclude-dir=dist`

Expected: only self-references. If a doc or script links to one of these files, update the link to the new `docs/archive/` path in the same commit.

- [ ] **Step 2: Move with git so history is preserved**

```bash
git mv APPLY_MIGRATION_030.md CROSSOVER_CHART_READY.md PARENT_CHILD_IMPLEMENTATION.md DESIGN_AUDIT.md docs/archive/
```

Note: do NOT move `SEO_ARCHITECTURE.md` or `PRODUCT_SUMMARY.md` — both are referenced as live docs.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: archive one-off scratch docs from repo root

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 1 — Split `persistence.ts` (5,334 lines → focused modules)

`src/lib/hunter/phases/persistence.ts` mixes claim-language policy, coverage-gap detection, pricing canonicalization, and text-similarity scoring into a "persistence" phase. Only `executePersistencePhase` is consumed externally (`src/lib/hunter/phases/index.ts:11`, `scripts/queue-worker.ts:668,862`), so all extractions are internal and safe.

Each task: create module → move symbols verbatim → import them back into `persistence.ts` → typecheck → characterization tests → commit. After each move, delete the originals from `persistence.ts`.

### Task 3: Extract claim-language policy module

**Files:**

- Create: `src/lib/hunter/content-policy/claim-language.ts`
- Modify: `src/lib/hunter/phases/persistence.ts`
- Test: `tests/lib/hunter/claim-language.test.ts`

- [ ] **Step 1: Create the module and move these symbols verbatim** (line numbers as of commit `4d852f7`):

Constants from `persistence.ts:114–141`: `CONDITIONAL_MARKERS`, `NEGATIVE_CUES`, `RISKY_ABSOLUTE_TERMS`, `UNVERIFIED_QUANT_VALUE`, `COMPARATOR_TOKENS`, `COMPARATOR_QUANT_TOKENS`, `DERIVED_METRIC_TOKENS`, `SALES_GATED_TOKENS`, `ENTERPRISE_SCOPE_TOKENS`, `CONTACT_SALES_TOKENS`, `SELF_SERVE_TOKENS`, `RANKING_CLAIM_TOKENS`, `TIME_QUANT_TOKENS`, `LE_CHAT_SCOPE_TOKENS`, `LE_CHAT_NAME_TOKENS`, `TERMINAL_PUNCTUATION`, `CONTROL_CHARS_REGEX`, `INCOMPLETE_CLAUSE_ENDING`, `COMMUNITY_HEDGING_PREFIX`, `AUTHORITATIVE_SOURCE_TYPES`.

Functions: `isConditional` (:402), `containsNegativeCue` (:406), `containsRiskyAbsolute` (:410), `hasComparatorToken` (:414), `sanitizeNarrativeClaimText` (:418), `stripTerminalPunctuation` (:422), `hasCommunityHedgingLanguage` (:426), `isRenderableClaimText` (:430), `sourceTierForClaim` (:437), `hasAbsoluteMarketingTerm` (:458), `softenAbsoluteMarketingLanguage` (:462), `sanitizeRiskyClaimLanguage` (:470), `suppressSalesGatedClaim` (:785), `rewriteVendorRankingClaim` (:813), `stripUnsupportedQuantitativePhrases` (:822), `enforceOfferingScope` (:832), `detectClaimKind` (:859), `downgradeComparativeClause` (:869), `isIntegrationGapClaim` (:1110), `isAuthoritativeClaim` (:1271), `validateNegativeClaim` (:4492).

Module header (add `export` to every moved function; constants stay un-exported unless persistence.ts or tests need them):

```typescript
/**
 * Claim-language policy: regex-driven sanitization, hedging, and
 * risk-classification rules applied to AI-generated claims before persistence.
 *
 * These rules encode StackHunt's legal/content policy (see
 * .claude/docs/LEGAL_COMPLIANCE.md). Behavior changes here must be covered
 * by the characterization tests in tests/lib/hunter/claim-language.test.ts.
 */
import type { ClaimWithSource } from '../types';
```

(If `ClaimWithSource` lives elsewhere, follow the existing import in `persistence.ts` — check its import block at lines 14–72.)

- [ ] **Step 2: Update `persistence.ts`** — delete the moved code, add one import:

```typescript
import {
  isConditional,
  containsNegativeCue,
  containsRiskyAbsolute,
  hasComparatorToken,
  sanitizeNarrativeClaimText,
  stripTerminalPunctuation,
  hasCommunityHedgingLanguage,
  isRenderableClaimText,
  sourceTierForClaim,
  hasAbsoluteMarketingTerm,
  softenAbsoluteMarketingLanguage,
  sanitizeRiskyClaimLanguage,
  suppressSalesGatedClaim,
  rewriteVendorRankingClaim,
  stripUnsupportedQuantitativePhrases,
  enforceOfferingScope,
  detectClaimKind,
  downgradeComparativeClause,
  isIntegrationGapClaim,
  isAuthoritativeClaim,
  validateNegativeClaim,
} from '../content-policy/claim-language';
```

- [ ] **Step 3: Typecheck — let the compiler find stragglers**

Run: `npm run typecheck`
Expected: errors only for helpers/constants the moved functions reference that you haven't moved yet. Move those too (verbatim), re-run until clean.

- [ ] **Step 4: Run the existing suite to prove no behavior change**

Run: `npm run test`
Expected: same pass count as on `main` (run once on a clean checkout first if unsure).

- [ ] **Step 5: Write characterization tests.** These pin current behavior; derive expected values from the moved regexes, then confirm by running. Starter file (extend to cover at least `sanitizeRiskyClaimLanguage`, `sourceTierForClaim`, `softenAbsoluteMarketingLanguage`, `detectClaimKind` after reading their bodies — assert what the code does today, not what you wish it did):

```typescript
import { describe, expect, it } from 'vitest';
import {
  isConditional,
  hasComparatorToken,
  isRenderableClaimText,
  stripTerminalPunctuation,
} from '@/lib/hunter/content-policy/claim-language';

describe('claim-language policy (characterization)', () => {
  it('flags conditional phrasing', () => {
    expect(isConditional('Exports work only if you are on the Pro plan')).toBe(true);
    expect(isConditional('Exports work on the Pro plan')).toBe(false);
  });

  it('strips terminal punctuation without touching inner text', () => {
    expect(stripTerminalPunctuation('Fast sync engine.')).toBe('Fast sync engine');
    expect(stripTerminalPunctuation('Fast sync engine')).toBe('Fast sync engine');
  });

  it('detects comparator tokens', () => {
    // Confirm expected values against COMPARATOR_TOKENS in the module before committing.
    expect(hasComparatorToken('2x faster than Notion')).toBe(true);
    expect(hasComparatorToken('a fast editor')).toBe(false);
  });

  it('rejects non-renderable claim text', () => {
    expect(isRenderableClaimText('')).toBe(false);
  });
});
```

- [ ] **Step 6: Run the new tests**

Run: `npx vitest run tests/lib/hunter/claim-language.test.ts`
Expected: PASS. If an assertion fails, the expected value is wrong (the move was verbatim) — fix the test to match actual behavior.

- [ ] **Step 7: Commit**

```bash
git add src/lib/hunter/content-policy/claim-language.ts src/lib/hunter/phases/persistence.ts tests/lib/hunter/claim-language.test.ts
git commit -m "refactor(hunter): extract claim-language policy from persistence phase

persistence.ts mixed content/legal policy into the persistence adapter.
Verbatim move + characterization tests; no behavior change.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4: Extract coverage-gap module

**Files:**

- Create: `src/lib/hunter/coverage/coverage-gaps.ts`
- Modify: `src/lib/hunter/phases/persistence.ts`
- Test: `tests/lib/hunter/coverage-gaps.test.ts`

- [ ] **Step 1: Move verbatim** into the new module, exporting everything listed:

Constants `persistence.ts:142–151`: `COVERAGE_ONBOARDING_TOKENS`, `COVERAGE_PRICING_TOKENS`, `COVERAGE_MIGRATION_TOKENS`, `COVERAGE_SUPPORT_TOKENS`, `DEFAULT_MIN_ACTIONABILITY_SCORE`, `DEFAULT_MIN_READER_UTILITY_SCORE`. **Export the four `COVERAGE_*` token regexes** — Task 11 reuses them.

Functions: `meetsAuthoritativeSourceThreshold` (:198), `getMinActionabilityScore` (:209), `getMinReaderUtilityScore` (:217), `getGenerationActionabilityScore` (:225), `getGenerationReaderUtilityScore` (:234), `meetsAuthoritativeDomainThreshold` (:253), `detectCoverageGaps` (:267), `maybeEnqueueCoverageGapRehunt` (:326), plus `isMissingGenerationQualityColumnError` (:243) only if nothing else in persistence uses it (check first — if persistence still uses it, leave it).

The `CoverageDimension` type: find its definition (`grep -n "CoverageDimension" src/lib/hunter`) — if it's local to persistence.ts, move it here and export it; if it's in `types.ts`, import it.

`maybeEnqueueCoverageGapRehunt` takes `deps: HunterDependencies` — import that type from `../types`.

- [ ] **Step 2: Re-import in `persistence.ts`**, typecheck, full test run.

Run: `npm run typecheck && npm run test`
Expected: clean / same pass count.

- [ ] **Step 3: Tests for the pure parts:**

```typescript
import { describe, expect, it } from 'vitest';
import { detectCoverageGaps } from '@/lib/hunter/coverage/coverage-gaps';

describe('detectCoverageGaps (characterization)', () => {
  it('reports all four gaps for an empty analysis', () => {
    expect(detectCoverageGaps({}, {})).toEqual([
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
  });

  it('treats smp_pricing plans on the knowledge card as pricing coverage', () => {
    const gaps = detectCoverageGaps({}, { smp_pricing: { plans: [] } });
    expect(gaps).not.toContain('pricing_ceilings');
  });

  it('treats setup_complexity tier as onboarding coverage', () => {
    const gaps = detectCoverageGaps({}, { setup_complexity: { tier: 'low' } });
    expect(gaps).not.toContain('onboarding');
  });
});
```

Run: `npx vitest run tests/lib/hunter/coverage-gaps.test.ts` — expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hunter/coverage/coverage-gaps.ts src/lib/hunter/phases/persistence.ts tests/lib/hunter/coverage-gaps.test.ts
git commit -m "refactor(hunter): extract coverage-gap detection from persistence phase

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 5: Extract pricing canonicalization + text-similarity modules

**Files:**

- Create: `src/lib/pricing/canonical-plans.ts`
- Create: `src/lib/hunter/text-similarity.ts`
- Modify: `src/lib/hunter/phases/persistence.ts`
- Test: `tests/lib/hunter/text-similarity.test.ts`, `tests/lib/pricing-canonical-plans.test.ts`

- [ ] **Step 1: Move to `src/lib/pricing/canonical-plans.ts`** (this dir already owns pricing logic — see `src/lib/pricing/persist.ts`): `inferTargetMarket` (:88), `buildCanonicalPricingPlans` (:888), `mapSmpPricingToPricingModel` (:3543), `isPricingBiasedDerivedCon` (:4333). Export all four.

- [ ] **Step 2: Move to `src/lib/hunter/text-similarity.ts`:** `normalizeFeatureLabel` (:502), `isGenericDifferentiator` (:511), `hasSpecificSignal` (:525), `featureOverlapRatio` (:534), `extractNamedFeatures` (:693), `overlapRatio` (:712), `tokenizeForSimilarity` (:3652), `jaccardSimilarity` (:3663). Export all.

- [ ] **Step 3: Re-import both in `persistence.ts`, typecheck, test.**

Run: `npm run typecheck && npm run test` — expected: clean / same pass count.

- [ ] **Step 4: Characterization tests:**

```typescript
// tests/lib/hunter/text-similarity.test.ts
import { describe, expect, it } from 'vitest';
import {
  jaccardSimilarity,
  tokenizeForSimilarity,
  overlapRatio,
} from '@/lib/hunter/text-similarity';

describe('text similarity (characterization)', () => {
  it('jaccard of identical sets is 1', () => {
    const a = tokenizeForSimilarity('best crm for startups');
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it('jaccard of disjoint sets is 0', () => {
    expect(
      jaccardSimilarity(tokenizeForSimilarity('alpha beta'), tokenizeForSimilarity('gamma delta'))
    ).toBe(0);
  });

  it('overlapRatio is symmetric-ish on shared tokens', () => {
    expect(overlapRatio('kanban board view', 'kanban board view')).toBeGreaterThan(0.9);
  });
});
```

```typescript
// tests/lib/pricing-canonical-plans.test.ts
import { describe, expect, it } from 'vitest';
import { inferTargetMarket, buildCanonicalPricingPlans } from '@/lib/pricing/canonical-plans';

describe('canonical pricing plans (characterization)', () => {
  it('handles empty plan input without throwing', () => {
    expect(() => inferTargetMarket([])).not.toThrow();
    expect(() => buildCanonicalPricingPlans(null)).not.toThrow();
  });
  // After reading the function bodies, add 2-3 assertions pinning real outputs,
  // e.g. a plans array with an enterprise tier inferring 'enterprise'.
});
```

Run: `npx vitest run tests/lib/hunter/text-similarity.test.ts tests/lib/pricing-canonical-plans.test.ts` — expected: PASS. Replace the placeholder comment in the pricing test with real pinned assertions before committing (read the moved bodies; the plan author did not have them in context — deriving 2–3 concrete cases is part of this task).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/canonical-plans.ts src/lib/hunter/text-similarity.ts src/lib/hunter/phases/persistence.ts tests/lib/hunter/text-similarity.test.ts tests/lib/pricing-canonical-plans.test.ts
git commit -m "refactor(hunter): extract pricing canonicalization and text similarity from persistence

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 6: Phase 1 gate + debt register

- [ ] **Step 1: Measure the shrink**

Run: `wc -l src/lib/hunter/phases/persistence.ts`
Expected: roughly 3,500–4,000 lines (from 5,334).

- [ ] **Step 2: Full gate**

Run: `npm run qa:prepush`
Expected: passes end-to-end. If `qa:rendered-tool-pages` fails for data reasons unrelated to this refactor, note it in the Decision Log with the failure output and continue.

- [ ] **Step 3: Run one real hunt as a smoke test** (requires `.env` with API keys):

Run: `npm run queue:worker -- --once`
Expected: completes a queue item (or reports an empty queue) with no new error classes in the log.

- [ ] **Step 4: Record the follow-up** — append to `docs/plans/tech-debt.md`:

```markdown
- 2026-06-10: persistence.ts still owns createReview (~400 lines), persistResearchOnly,
  updatePricingOnly, and quality-gate snapshot writing. Next split: move each into
  src/lib/hunter/phases/persistence/ submodules. Claim-language, coverage, pricing
  canonicalization, and text-similarity were extracted (see 2026-06-10 plan).
- 2026-06-10: No error-tracking vendor (Sentry) on cron/queue paths; console + Discord only.
```

- [ ] **Step 5: Commit**

```bash
git add docs/plans/tech-debt.md
git commit -m "docs(debt): record remaining persistence split and observability follow-ups

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 2 — Prompt versioning with drift enforcement

### Task 7: Prompt registry + hash-drift test + stamping

**Files:**

- Create: `src/lib/hunter/prompts/registry.ts`
- Modify: `src/lib/hunter/phases/analysis.ts` (generationQuality assembly, near line 186)
- Test: `tests/lib/prompt-registry.test.ts`

- [ ] **Step 1: Create the registry:**

```typescript
/**
 * Prompt registry: stable version ids + content fingerprints for every
 * LLM prompt that shapes persisted review content.
 *
 * Rule: any edit to a prompt's text MUST bump its version and update its
 * sha256 here. tests/lib/prompt-registry.test.ts enforces the fingerprint;
 * the version id is stamped into reviews.generation_quality.promptVersions
 * so review quality can be correlated with prompt revisions.
 */
import { createHash } from 'node:crypto';
import { SYNTHESIS_PROMPT } from '../services/prompts';
import { buildExtractionPrompt } from './extraction';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// Fixed canonical input so the extraction fingerprint is deterministic.
// Field names must match ExtractionPromptInput (src/lib/hunter/prompts/extraction.ts:10)
// — adjust this literal to satisfy the type, but never change it afterwards
// without bumping the extraction version.
const EXTRACTION_FINGERPRINT_INPUT = {
  toolName: '__fingerprint__',
} as Parameters<typeof buildExtractionPrompt>[0];

export const PROMPT_VERSIONS = {
  synthesis: 'synthesis-v1',
  extraction: 'extraction-v1',
} as const;

export const PROMPT_FINGERPRINTS: Record<keyof typeof PROMPT_VERSIONS, string> = {
  // Fill with values printed by the drift test on first run (Step 3).
  synthesis: 'FILL_ME',
  extraction: 'FILL_ME',
};

export function computePromptFingerprints(): Record<keyof typeof PROMPT_VERSIONS, string> {
  return {
    synthesis: sha256(SYNTHESIS_PROMPT),
    extraction: sha256(buildExtractionPrompt(EXTRACTION_FINGERPRINT_INPUT)),
  };
}
```

`ExtractionPromptInput` has required fields beyond `toolName` — read `src/lib/hunter/prompts/extraction.ts:10–32` and complete the literal with fixed dummy values.

- [ ] **Step 2: Write the drift test:**

```typescript
import { describe, expect, it } from 'vitest';
import { PROMPT_FINGERPRINTS, computePromptFingerprints } from '@/lib/hunter/prompts/registry';

describe('prompt registry drift', () => {
  it('every prompt edit bumps its version and fingerprint', () => {
    const actual = computePromptFingerprints();
    for (const [name, expected] of Object.entries(PROMPT_FINGERPRINTS)) {
      expect(
        actual[name as keyof typeof actual],
        `Prompt "${name}" changed. Bump PROMPT_VERSIONS.${name} and update PROMPT_FINGERPRINTS.${name} to ${actual[name as keyof typeof actual]}`
      ).toBe(expected);
    }
  });
});
```

- [ ] **Step 3: Run it to capture real fingerprints**

Run: `npx vitest run tests/lib/prompt-registry.test.ts`
Expected: FAIL with the message containing the actual hashes. Paste them into `PROMPT_FINGERPRINTS`, re-run, expected: PASS.

- [ ] **Step 4: Stamp versions into generation quality.** In `src/lib/hunter/phases/analysis.ts`, find where the `generationQuality` object is assembled (it is used at line 186; locate the construction with `grep -n "generationQuality" src/lib/hunter/phases/analysis.ts` and read upward to the object literal). Add:

```typescript
import { PROMPT_VERSIONS } from '../prompts/registry';
// ...inside the generationQuality object literal:
promptVersions: PROMPT_VERSIONS,
```

This flows into `reviews.generation_quality` (jsonb) automatically via `persistence.ts:2571` and `createReview` — no migration needed. If `generationQuality` has a strict TypeScript type, add `promptVersions: Record<string, string>` to it.

- [ ] **Step 5: Verify end-to-end**

Run: `npm run typecheck && npm run test`
Expected: clean. Then run one hunt (`npm run queue:worker -- --once`) and confirm the newest review row has `generation_quality->promptVersions` populated:

```sql
select id, generation_quality->'promptVersions' from reviews order by updated_at desc limit 1;
```

(via Supabase MCP `execute_sql` or the dashboard SQL editor).

- [ ] **Step 6: Commit**

```bash
git add src/lib/hunter/prompts/registry.ts src/lib/hunter/phases/analysis.ts tests/lib/prompt-registry.test.ts
git commit -m "feat(hunter): add prompt registry with drift test and review stamping

Prompt edits now require a version bump (enforced by fingerprint test) and
every review records which prompt versions produced it.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 3 — Eval harness (capture → replay → score)

The hunt queue already checkpoints research output in `hunt_queue.phase_checkpoint.research` (see `orchestrator.ts:200–240` resume logic). The harness reuses those checkpoints as frozen fixtures, replays only the analysis phase (the Gemini synthesis), and scores the output. This makes prompt changes measurable without re-spending Serper credits.

### Task 8: Fixture capture script

**Files:**

- Create: `scripts/capture-eval-fixtures.ts`
- Create: `evals/fixtures/.gitkeep`, `evals/golden/.gitkeep`, `evals/reports/.gitignore` (content: `*` then `!.gitignore`)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the capture script.** Mirror the env bootstrap used by `scripts/queue-worker.ts` (read its top ~30 lines and copy the dotenv/client setup):

```typescript
/**
 * Capture eval fixtures from hunt_queue research checkpoints.
 * Usage: npm run eval:capture -- --limit 8 [--tool "Notion"]
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.indexOf('--limit');
  const toolArg = args.indexOf('--tool');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : 8;

  let query = supabase
    .from('hunt_queue')
    .select('id, tool_name, context_title, category_slug, phase_checkpoint, updated_at')
    .not('phase_checkpoint', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(Math.min(limit, 25));
  if (toolArg >= 0) query = query.eq('tool_name', args[toolArg + 1]);

  const { data, error } = await query;
  if (error) throw new Error(`hunt_queue query failed: ${error.message}`);

  const outDir = resolve(import.meta.dirname, '../evals/fixtures');
  mkdirSync(outDir, { recursive: true });
  let written = 0;
  for (const row of data || []) {
    const research = (row.phase_checkpoint as any)?.research;
    if (!research?.scoutResult || !research?.knowledgeCard) continue;
    const slug = slugify(`${row.tool_name}-${row.context_title || 'general'}`);
    const fixture = {
      capturedAt: new Date().toISOString(),
      queueItemId: row.id,
      toolName: row.tool_name,
      contextTitle: row.context_title,
      categorySlug: row.category_slug,
      research,
    };
    writeFileSync(resolve(outDir, `${slug}.json`), JSON.stringify(fixture, null, 2));
    console.log(`captured ${slug}.json`);
    written += 1;
  }
  console.log(`${written} fixture(s) written to evals/fixtures/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add npm scripts** to `package.json` (next to the other `qa:`/`hunt` scripts):

```json
"eval:capture": "npx tsx scripts/capture-eval-fixtures.ts",
"eval:hunter": "npx tsx scripts/eval-hunter.ts"
```

- [ ] **Step 3: Run capture**

Run: `npm run eval:capture -- --limit 8`
Expected: prints `captured <slug>.json` lines. If zero fixtures are written, the checkpoint shape differs — inspect one row (`select phase_checkpoint from hunt_queue where phase_checkpoint is not null limit 1`) and adjust the `research?.scoutResult` guard to match reality. Pick 5–8 fixtures spanning popular and obscure tools; delete the rest.

- [ ] **Step 4: Decide fixture privacy.** Fixtures contain scraped third-party text. Default: commit them (the repo already persists this data in the DB). If any fixture looks legally sensitive per `.claude/docs/LEGAL_COMPLIANCE.md`, gitignore `evals/fixtures/` instead and note the choice in the Decision Log.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture-eval-fixtures.ts package.json evals/
git commit -m "feat(evals): capture research checkpoints as replayable fixtures

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 9: Golden expectations

**Files:**

- Create: `evals/golden/<slug>.json` — one per fixture
- Create: `evals/README.md`

- [ ] **Step 1: For each fixture, author a golden file** by reading the corresponding published review (admin dashboard or `select * from reviews ...`) and the fixture's knowledge card. Schema:

```json
{
  "toolName": "Notion",
  "minClaimCitationRate": 0.85,
  "minActionabilityScore": 58,
  "minReaderUtilityScore": 62,
  "maxCoverageGaps": 1,
  "mustMentionAny": [
    ["free plan", "free tier"],
    ["per user", "per seat"]
  ],
  "mustNotContain": ["best tool ever", "guaranteed"]
}
```

`mustMentionAny` is a list of synonym groups — at least one phrase per group must appear (case-insensitive) in the synthesized summary + pros + cons. Pick facts that are stable and verifiable from the fixture's own sources (pricing model, a hard limit), not volatile numbers.

- [ ] **Step 2: Write `evals/README.md`:**

```markdown
# Hunter Eval Harness

Measures analysis-phase output quality against frozen research fixtures.
Run before merging any change to prompts (src/lib/hunter/services/prompts.ts,
src/lib/hunter/prompts/), the Gemini service, or the analysis phase.

- `npm run eval:capture -- --limit 8` — snapshot hunt_queue research checkpoints into fixtures/
- `npm run eval:hunter` — replay analysis on every fixture (real Gemini calls, ~1 synthesis call per fixture) and score against golden/
- Reports land in reports/ (gitignored)

A fixture/golden pair is the contract: same research in, output must stay above
the thresholds in golden/<slug>.json. Bump prompt versions (src/lib/hunter/prompts/registry.ts)
in the same PR as any intentional quality shift, and update goldens with justification.
```

- [ ] **Step 3: Commit**

```bash
git add evals/
git commit -m "feat(evals): add golden expectations and harness docs

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 10: Replay + scoring script

**Files:**

- Create: `scripts/eval-hunter.ts`

- [ ] **Step 1: Write the runner.** Build `ctx`/`deps` the same way `scripts/queue-worker.ts:695–733` does for persistence-only execution, but for the analysis phase: real `GeminiService`, `skipPersistence: true`, research loaded from the fixture. Skeleton (reconcile field names against `HunterContext`/`HunterDependencies` in `src/lib/hunter/types.ts:683–692` — `npm run typecheck` is the referee):

```typescript
/**
 * Replay the analysis phase against frozen research fixtures and score output.
 * Usage: npm run eval:hunter [-- --only <slug>]
 * Costs: one Gemini synthesis call per fixture. Keep fixtures <= 10.
 */
import 'dotenv/config';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeAnalysisPhase } from '../src/lib/hunter/phases/analysis';
import { GeminiService } from '../src/lib/hunter/services/gemini';
import { detectCoverageGaps } from '../src/lib/hunter/coverage/coverage-gaps';

interface Golden {
  toolName: string;
  minClaimCitationRate: number;
  minActionabilityScore: number;
  minReaderUtilityScore: number;
  maxCoverageGaps: number;
  mustMentionAny: string[][];
  mustNotContain: string[];
}

function claimCitationRate(analysis: any): number {
  const claims = [...(analysis?.pros || []), ...(analysis?.cons || [])];
  if (claims.length === 0) return 0;
  const cited = claims.filter(
    (claim: any) =>
      typeof claim === 'object' && (claim?.sourceUrl || claim?.source_url || claim?.source)
  );
  return cited.length / claims.length;
}

function reviewText(analysis: any): string {
  const claims = [...(analysis?.pros || []), ...(analysis?.cons || [])]
    .map((claim: any) => (typeof claim === 'string' ? claim : claim?.text || ''))
    .join('\n');
  return `${analysis?.summary || ''}\n${claims}`.toLowerCase();
}

async function evalFixture(
  slug: string
): Promise<{ slug: string; failures: string[]; metrics: Record<string, unknown> }> {
  const fixture = JSON.parse(readFileSync(resolve('evals/fixtures', `${slug}.json`), 'utf8'));
  const golden: Golden = JSON.parse(readFileSync(resolve('evals/golden', `${slug}.json`), 'utf8'));

  const gemini = new GeminiService({ apiKey: process.env.GEMINI_API_KEY! });
  const ctx: any = {
    toolName: fixture.toolName,
    contextTitle: fixture.contextTitle,
    categorySlug: fixture.categorySlug,
    huntType: 'full',
    skipPersistence: true,
    startTime: Date.now(),
    tokensUsed: 0,
    logs: [],
    research: fixture.research,
  };
  const deps: any = {
    supabase: null,
    serper: null,
    gemini,
    inventory: null,
    logo: null,
    config: { isDraftMode: true },
    withRetry: async <T>(fn: () => Promise<T>) => fn(),
    log: (message: string) => console.log(`[eval:${slug}] ${message}`),
  };

  const output = await executeAnalysisPhase(ctx, deps);
  const analysis = (output as any).analysis ?? output;
  const quality = (analysis?.generationQuality ??
    (output as any).generationQuality ??
    {}) as Record<string, any>;

  const metrics = {
    claimCitationRate: claimCitationRate(analysis),
    actionabilityScore: quality.actionabilityScore ?? null,
    readerUtilityScore: quality.readerUtilityScore ?? null,
    coverageGaps: detectCoverageGaps(analysis, fixture.research.knowledgeCard, quality),
    promptVersions: quality.promptVersions ?? null,
  };

  const text = reviewText(analysis);
  const failures: string[] = [];
  if (metrics.claimCitationRate < golden.minClaimCitationRate)
    failures.push(
      `citation rate ${metrics.claimCitationRate.toFixed(2)} < ${golden.minClaimCitationRate}`
    );
  if ((metrics.actionabilityScore ?? 0) < golden.minActionabilityScore)
    failures.push(`actionability ${metrics.actionabilityScore} < ${golden.minActionabilityScore}`);
  if ((metrics.readerUtilityScore ?? 0) < golden.minReaderUtilityScore)
    failures.push(`reader utility ${metrics.readerUtilityScore} < ${golden.minReaderUtilityScore}`);
  if (metrics.coverageGaps.length > golden.maxCoverageGaps)
    failures.push(`coverage gaps [${metrics.coverageGaps.join(',')}] > ${golden.maxCoverageGaps}`);
  for (const group of golden.mustMentionAny)
    if (!group.some((phrase) => text.includes(phrase.toLowerCase())))
      failures.push(`missing all of: ${group.join(' | ')}`);
  for (const banned of golden.mustNotContain)
    if (text.includes(banned.toLowerCase())) failures.push(`contains banned phrase: ${banned}`);

  return { slug, failures, metrics };
}

async function main() {
  const args = process.argv.slice(2);
  const onlyIdx = args.indexOf('--only');
  const slugs = readdirSync(resolve('evals/fixtures'))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .filter((slug) => existsSync(resolve('evals/golden', `${slug}.json`)))
    .filter((slug) => (onlyIdx >= 0 ? slug === args[onlyIdx + 1] : true));

  const results = [];
  for (const slug of slugs) results.push(await evalFixture(slug)); // sequential: rate limits

  mkdirSync(resolve('evals/reports'), { recursive: true });
  const report = { ranAt: new Date().toISOString(), results };
  writeFileSync(
    resolve('evals/reports', `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`),
    JSON.stringify(report, null, 2)
  );

  let failed = 0;
  for (const result of results) {
    const status = result.failures.length === 0 ? 'PASS' : 'FAIL';
    if (status === 'FAIL') failed += 1;
    console.log(`${status}  ${result.slug}  ${JSON.stringify(result.metrics)}`);
    result.failures.forEach((failure) => console.log(`      - ${failure}`));
  }
  console.log(`\n${results.length - failed}/${results.length} fixtures passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

The `analysis` / `generationQuality` unwrapping above is a best guess — read `AnalysisOutput` in `src/lib/hunter/types.ts` and `executeAnalysisPhase`'s return statement, then fix the property access. Same for the claim object's source-url field name (check `ClaimWithSource`).

- [ ] **Step 2: Typecheck and run one fixture**

Run: `npm run typecheck`
Expected: clean.

Run: `npm run eval:hunter -- --only <one-slug>`
Expected: a PASS/FAIL line with real metrics and a report file in `evals/reports/`. Iterate on golden thresholds until the current `main` output passes — the baseline must be green so future regressions are signal, not noise.

- [ ] **Step 3: Run the full set**

Run: `npm run eval:hunter`
Expected: `N/N fixtures passed`.

- [ ] **Step 4: Commit**

```bash
git add scripts/eval-hunter.ts evals/
git commit -m "feat(evals): replay analysis phase against fixtures and score vs goldens

Prompt/model changes are now measurable: frozen research in, scored
synthesis out, nonzero exit on regression.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4 — Adaptive research querying

Today coverage gaps are detected in _persistence_ (after all Serper + Gemini spend) and fixed by enqueueing a full re-hunt (`maybeEnqueueCoverageGapRehunt`). Cheaper: detect lane gaps in the _research phase_ from scout results and run targeted follow-up queries before extraction. The post-hoc re-hunt stays as a backstop.

### Task 11: Research-time gap detection + follow-up scout

**Files:**

- Create: `src/lib/hunter/coverage/research-gaps.ts`
- Modify: `src/lib/hunter/phases/research.ts` (after scout + collision filtering, before Knowledge Card extraction)
- Test: `tests/lib/hunter/research-gaps.test.ts`

- [ ] **Step 1: Write the failing tests first:**

```typescript
import { describe, expect, it } from 'vitest';
import { detectSourceLaneGaps, buildGapQueries } from '@/lib/hunter/coverage/research-gaps';

const source = (snippet: string) => ({
  url: `https://example.com/${snippet.length}`,
  title: '',
  snippet,
});

describe('detectSourceLaneGaps', () => {
  it('reports all lanes when sources have no lane signals', () => {
    expect(detectSourceLaneGaps([source('a nice tool for notes')])).toEqual([
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
  });

  it('does not report a lane that a source snippet covers', () => {
    // 'pricing' must match COVERAGE_PRICING_TOKENS — verify against the regex.
    const gaps = detectSourceLaneGaps([source('pricing starts at $10 per seat')]);
    expect(gaps).not.toContain('pricing_ceilings');
  });
});

describe('buildGapQueries', () => {
  it('builds one query per gap, capped at 4, mentioning the tool', () => {
    const queries = buildGapQueries('Linear', [
      'onboarding',
      'pricing_ceilings',
      'migration_risk',
      'support_quality',
    ]);
    expect(queries).toHaveLength(4);
    expect(queries.every((query) => query.includes('Linear'))).toBe(true);
  });

  it('returns empty for no gaps', () => {
    expect(buildGapQueries('Linear', [])).toEqual([]);
  });
});
```

Run: `npx vitest run tests/lib/hunter/research-gaps.test.ts` — expected: FAIL (module not found).

- [ ] **Step 2: Implement the module** (reuses the regexes exported in Task 4):

```typescript
/**
 * Research-time coverage-gap detection. Runs over raw scout sources BEFORE
 * Knowledge Card extraction so missing lanes (pricing, onboarding, migration,
 * support) can be filled with targeted follow-up queries in the same hunt,
 * instead of a full re-hunt from persistence.
 */
import {
  COVERAGE_ONBOARDING_TOKENS,
  COVERAGE_PRICING_TOKENS,
  COVERAGE_MIGRATION_TOKENS,
  COVERAGE_SUPPORT_TOKENS,
  type CoverageDimension,
} from './coverage-gaps';

interface ScoutSourceLike {
  url?: string;
  title?: string;
  snippet?: string;
}

const LANE_TOKENS: Array<{ lane: CoverageDimension; tokens: RegExp }> = [
  { lane: 'onboarding', tokens: COVERAGE_ONBOARDING_TOKENS },
  { lane: 'pricing_ceilings', tokens: COVERAGE_PRICING_TOKENS },
  { lane: 'migration_risk', tokens: COVERAGE_MIGRATION_TOKENS },
  { lane: 'support_quality', tokens: COVERAGE_SUPPORT_TOKENS },
];

const GAP_QUERY_TEMPLATES: Record<CoverageDimension, (toolName: string) => string> = {
  onboarding: (toolName) => `${toolName} setup onboarding how long to get started`,
  pricing_ceilings: (toolName) => `${toolName} pricing plan limits hidden costs`,
  migration_risk: (toolName) => `${toolName} export data migrate away lock-in`,
  support_quality: (toolName) => `${toolName} support response time reddit`,
};

export function detectSourceLaneGaps(sources: ScoutSourceLike[]): CoverageDimension[] {
  const corpus = sources
    .map((source) => `${source.title || ''} ${source.snippet || ''}`)
    .join('\n');
  return LANE_TOKENS.filter(({ tokens }) => !tokens.test(corpus)).map(({ lane }) => lane);
}

export function buildGapQueries(toolName: string, gaps: CoverageDimension[]): string[] {
  return gaps.slice(0, 4).map((gap) => GAP_QUERY_TEMPLATES[gap](toolName));
}
```

If `CoverageDimension` doesn't include exactly these four values, align `LANE_TOKENS`/templates with the real union from Task 4.

- [ ] **Step 3: Run the tests**

Run: `npx vitest run tests/lib/hunter/research-gaps.test.ts` — expected: PASS.

- [ ] **Step 4: Wire into the research phase.** In `src/lib/hunter/phases/research.ts`, after the name-collision filtering block (which ends ~line 120) and before Knowledge Card extraction, insert:

```typescript
// Adaptive follow-up: fill lane gaps with targeted queries before extraction.
if (ctx.huntType === 'full') {
  const laneGaps = detectSourceLaneGaps(scoutResult.raw_sources);
  if (laneGaps.length > 0) {
    const gapQueries = buildGapQueries(toolName, laneGaps);
    deps.log(
      `[Adaptive Research] Lane gaps: ${laneGaps.join(', ')} → ${gapQueries.length} follow-up queries`
    );
    try {
      const followUp = await deps.serper.scout(
        toolName,
        ctx.contextTitle,
        deps.withRetry,
        gapQueries,
        ctx.entityScope
      );
      const knownUrls = new Set(scoutResult.raw_sources.map((source: any) => source.url));
      const merged = followUp.raw_sources.filter((source: any) => !knownUrls.has(source.url));
      scoutResult.raw_sources.push(...merged);
      deps.log(
        `[Adaptive Research] Merged ${merged.length} new sources (${scoutResult.raw_sources.length} total)`
      );
    } catch (error) {
      deps.log(
        `[Adaptive Research] Follow-up scout failed, continuing with base sources: ${(error as Error).message}`
      );
    }
  }
}
```

with the import at the top: `import { detectSourceLaneGaps, buildGapQueries } from '../coverage/research-gaps';`

Before committing, read `SerperService.scout` (`src/lib/hunter/services/serper.ts:326`) to confirm: (a) the 4th parameter overrides the default 12 queries rather than appending (the dossier path at `research.ts:51–60` implies it does), and (b) whether `scout` has side effects (token accounting on `scoutResult.tokensUsed` etc.) that need merging too — if `followUp.tokensUsed` exists, add it to the parent result.

- [ ] **Step 5: Validate**

Run: `npm run typecheck && npm run test` — expected: clean.

Smoke: `npm run hunt -- --tool="<some small tool>" --context="Best for X"` and confirm `[Adaptive Research]` log lines appear when gaps exist, and total Serper queries grow by at most 4.

- [ ] **Step 6: Commit**

```bash
git add src/lib/hunter/coverage/research-gaps.ts src/lib/hunter/phases/research.ts tests/lib/hunter/research-gaps.test.ts
git commit -m "feat(hunter): adaptive research follow-up queries for coverage-lane gaps

Detect missing pricing/onboarding/migration/support signals in scout
results and run up to 4 targeted follow-up queries in the same hunt,
instead of relying solely on post-persistence re-hunts.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 5 — Hunt cost observability

`HuntTelemetry` (tokens/retries/estimated cost, `src/lib/hunter/types.ts:94–120`) is computed per hunt (`orchestrator.ts:118,180`) but never persisted. Persist it and add a cost report.

### Task 12: `hunt_telemetry` table + orchestrator write

**Files:**

- Create: `supabase/migrations/20260610120000_add_hunt_telemetry.sql`
- Modify: `src/lib/hunter/orchestrator.ts`

- [ ] **Step 1: Write the migration** (apply via Supabase MCP `apply_migration` with name `add_hunt_telemetry` if available, otherwise save the file and run `npm run db:migrate`):

```sql
create table if not exists hunt_telemetry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tool_name text not null,
  context_title text,
  queue_item_id uuid references hunt_queue(id) on delete set null,
  success boolean not null,
  duration_ms integer,
  tokens_total integer,
  tokens_research integer,
  tokens_analysis integer,
  retries integer,
  timeout_failures integer,
  estimated_cost_usd numeric(10, 5),
  error_class text
);

create index if not exists hunt_telemetry_created_at_idx on hunt_telemetry (created_at desc);
create index if not exists hunt_telemetry_tool_name_idx on hunt_telemetry (tool_name);

alter table hunt_telemetry enable row level security;
-- service-role only: no public policies. Writes come from the hunter (service key).
```

- [ ] **Step 2: Regenerate types and check advisors**

Run: `npm run types:db` (needs `SUPABASE_ACCESS_TOKEN`). If MCP is available, also run `get_advisors` for security findings on the new table.

- [ ] **Step 3: Write from the orchestrator.** Find where the hunt result is assembled with `telemetry: this.buildHuntTelemetry(totalTokens)` (`orchestrator.ts:180`) and the corresponding failure path(s). Add a private method and call it (fire-and-forget with `.catch`) from both success and failure result paths:

```typescript
private async recordHuntTelemetry(params: {
  toolName: string;
  contextTitle?: string;
  queueItemId?: string;
  success: boolean;
  durationMs: number;
  telemetry?: HuntTelemetry;
  errorClass?: string;
}): Promise<void> {
  const { error } = await this.supabase.from('hunt_telemetry').insert({
    tool_name: params.toolName,
    context_title: params.contextTitle ?? null,
    queue_item_id: params.queueItemId ?? null,
    success: params.success,
    duration_ms: params.durationMs,
    tokens_total: params.telemetry?.tokens.total ?? null,
    tokens_research: params.telemetry?.tokens.research ?? null,
    tokens_analysis: params.telemetry?.tokens.analysis ?? null,
    retries: params.telemetry?.retries.retries ?? null,
    timeout_failures: params.telemetry?.retries.timeoutFailures ?? null,
    estimated_cost_usd: params.telemetry?.cost.estimatedUsd ?? null,
    error_class: params.errorClass ?? null,
  });
  if (error) this.log(`[Telemetry] Failed to persist hunt telemetry: ${error.message}`);
}
```

Call sites: wherever the orchestrator returns/throws a final hunt outcome. Use `classifyErrorForDlq` (already imported in orchestrator) for `errorClass` on failures. Use `void this.recordHuntTelemetry({...}).catch(() => {})` so telemetry can never fail a hunt.

- [ ] **Step 4: Validate**

Run: `npm run typecheck && npm run test` — expected: clean.

Smoke: `npm run queue:worker -- --once`, then `select * from hunt_telemetry order by created_at desc limit 3;` — expected: a row per hunt with non-null tokens/cost on success.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260610120000_add_hunt_telemetry.sql src/types/supabase.ts src/lib/hunter/orchestrator.ts
git commit -m "feat(observability): persist per-hunt telemetry (tokens, cost, retries, errors)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 13: Cost report script

**Files:**

- Create: `scripts/report-hunt-costs.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the report:**

```typescript
/**
 * Hunt cost report: last N days of hunt_telemetry.
 * Usage: npm run qa:hunt-costs [-- --days 7]
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const args = process.argv.slice(2);
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('hunt_telemetry')
    .select('tool_name, success, duration_ms, tokens_total, estimated_cost_usd, error_class')
    .gte('created_at', since)
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows = data || [];
  const succeeded = rows.filter((row) => row.success);
  const totalCost = rows.reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0);
  const totalTokens = rows.reduce((sum, row) => sum + (row.tokens_total || 0), 0);

  console.log(`Hunt costs — last ${days} day(s)`);
  console.log(
    `  hunts: ${rows.length}  success rate: ${rows.length ? ((succeeded.length / rows.length) * 100).toFixed(1) : 0}%`
  );
  console.log(`  total est. cost: $${totalCost.toFixed(4)}  total tokens: ${totalTokens}`);
  console.log(`  avg cost/hunt: $${rows.length ? (totalCost / rows.length).toFixed(4) : 0}`);

  const byTool = new Map<string, number>();
  for (const row of rows)
    byTool.set(
      row.tool_name,
      (byTool.get(row.tool_name) || 0) + Number(row.estimated_cost_usd || 0)
    );
  const top = [...byTool.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log('  most expensive tools:');
  for (const [tool, cost] of top) console.log(`    ${tool}: $${cost.toFixed(4)}`);

  const errorClasses = new Map<string, number>();
  for (const row of rows.filter((entry) => !entry.success))
    errorClasses.set(
      row.error_class || 'unknown',
      (errorClasses.get(row.error_class || 'unknown') || 0) + 1
    );
  if (errorClasses.size > 0) {
    console.log('  failures by class:');
    for (const [errorClass, count] of errorClasses) console.log(`    ${errorClass}: ${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script:** `"qa:hunt-costs": "npx tsx scripts/report-hunt-costs.ts"`

- [ ] **Step 3: Run it**

Run: `npm run qa:hunt-costs`
Expected: a summary (may be near-empty until hunts run post-Task-12).

- [ ] **Step 4: Final gate and commit**

Run: `npm run qa:prepush` — expected: passes.

```bash
git add scripts/report-hunt-costs.ts package.json
git commit -m "feat(observability): add hunt cost report script

Co-Authored-By: Claude <noreply@anthropic.com>"
```

- [ ] **Step 5: Close out the plan.** Update `CLAUDE.md` Commands section with `eval:capture`, `eval:hunter`, `qa:hunt-costs` (one line each), move this plan file to `docs/plans/completed/`, and commit.

---

## Decision Log

- 2026-06-10: Plan authored from repo review (commit `4d852f7`). Line numbers in Phase 1 reference that commit; re-grep if the file has drifted.
- 2026-06-10: Sentry integration deliberately deferred to tech-debt — needs an account/DSN decision from Richard.
- 2026-06-10: Prompt versions stored inside existing `reviews.generation_quality` jsonb to avoid a migration; promote to a real column only if querying by version becomes routine.

## Exit Criteria

- `README.md` accurately describes the stack; repo root has no scratch docs.
- `persistence.ts` ≤ ~4,000 lines; claim-language, coverage, pricing-canonical, and text-similarity logic live in dedicated modules, each with passing characterization tests; `npm run qa:prepush` green.
- Editing `SYNTHESIS_PROMPT` without bumping `PROMPT_VERSIONS.synthesis` fails `npm run test`; new reviews carry `generation_quality.promptVersions`.
- `npm run eval:hunter` replays ≥5 fixtures against goldens, writes a report, exits nonzero on regression, and passes on current `main`.
- Hunts with missing coverage lanes emit `[Adaptive Research]` logs and merge follow-up sources, capped at 4 extra queries.
- Every hunt writes a `hunt_telemetry` row; `npm run qa:hunt-costs` prints spend, success rate, and failure classes.
