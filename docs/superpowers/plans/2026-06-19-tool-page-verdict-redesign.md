# Tool Page Verdict Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/tool/[slug]` as a decision-authority page: a real verdict instrument (score + one-line verdict + best-for/not-for/main-risk) leads the hero, the "Visit" CTA becomes calm secondary chrome, the pipeline stops emitting Frankenstein/templated claims, the single decision-snapshot path replaces the broken legacy verdict narrative, and the page sheds its accordion sprawl, hedging noise, and triple-redundant alternatives — all on the same warm-black `ink`/`signal` identity the homepage decision-instrument adopts.

**Architecture:** All formatting/resolution/quality logic lives in pure, unit-tested helpers under `src/lib/tool-page/**` (already the established pattern) and `src/lib/homepage.ts` (reused for score/verdict formatting). `src/pages/tool/[slug].astro` and the `*.astro` components are thin consumers. Pipeline content-quality fixes are isolated to `src/lib/hunter/services/gemini.ts` claim-shaping helpers and validated by Vitest. No DB schema migration is required; a score-coverage audit (Phase 1, Task 1) decides whether a one-time backfill RPC is needed.

**Tech Stack:** Astro 5 (SSR, `prerender = false`), React 18 islands, Tailwind, Vitest, Supabase client, Gemini 2.0 Flash (analysis), `getScoreColor` from `@/lib/utils`.

## Global Constraints

- **This page is decision-authority, not affiliate-conversion.** The verdict (score + label + best-for/not-for/main-risk) is the loudest element. The "Visit"/affiliate CTA must be visibly secondary — never a full-width filled amber bar above the verdict (current `[slug].astro:405-421` sidebar CTA + `AffiliateButton` dominance is the anti-pattern being removed).
- **Score scale is 0–100.** Display the integer (e.g. `82`), never `/10`. Reuse `formatScore()` from `src/lib/homepage.ts`.
- **Brand color ≠ data color.** Brand amber (`signal` / existing `hunt-*`/`amber-*`) is decoration and CTA only and must NEVER color a score, fit cell, or status. Scores/fit/status use the functional scale from `getScoreColor(score)` (`emerald ≥85 / green ≥70 / amber ≥50 / orange ≥30 / red`). Do not introduce a parallel score-color system.
- **Identity tokens (shared with homepage decision-instrument plan `docs/superpowers/plans/2026-06-17-homepage-decision-instrument.md`, Task 1):** `ink.950 #0B0B0D` base, `ink.900 #141417` surface, `ink.800 #1C1B1E` raised, `ink.border #26241F`, `paper #EDEAE3` text, `paper.muted #9A968C`, `signal #E8B14C` accent. If these are not yet present in `tailwind.config.js` when this plan executes, Phase 0 Task 1 adds them (idempotent with the homepage plan).
- **Type:** display = `Space Grotesk` (`font-grotesk`), body = `Inter` (`font-sans`), data/utility = `IBM Plex Mono` (`font-mono`) for scores, eyebrows, tags, pricing, counts.
- **Copy: no hedge-copy.** Confidence/freshness collapse to ONE "Last verified <date>" line. Ban these strings from rendered output unless inside that single line or a single `<details>`: "Pending verification", "Data confidence", "Not confirmed", "Evaluation depth", "validated against source documentation", "Needs confirmation". The pipeline must never concatenate two independent clauses into one claim (no "Avoid where Can block teams that require reports indicate…").
- **All Supabase queries keep `.limit()`** (existing `src/lib/tool-page/data/data.ts` functions already do).
- **Quality floor:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, page renders meaningfully without client JS (islands are progressive enhancements).
- **Tests:** Vitest, `npm run test`. Test files under `tests/` mirroring `src/`. `@/` alias resolves in tests. Gate before claiming done: `npm run typecheck && npm run build && npm run test`.
- **Commits:** conventional commits, stage specific files (not `git add -A`), end with `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## Phase 0 — Identity alignment & verdict-instrument composition (DESIGN GATE)

> This phase produces a single approved visual composition for the hero verdict instrument before any production component is built. It exists because the user chose "open to a fresh visual direction" — but the homepage decision-instrument already defines that direction, so this phase _adopts and extends_ it rather than inventing a third look. **No Phase 3+ UI task may begin until the prototype in Task 0.2 is approved.**

### Task 0.1: Ensure identity tokens exist

**Files:**

- Modify: `tailwind.config.js` (`theme.extend.colors`, `theme.extend.fontFamily`)
- Modify: `src/layouts/BaseLayout.astro` (Google Fonts `<link>`/preload block)
- Test: `tests/config/theme-tokens.test.ts`

**Interfaces:**

- Produces: Tailwind classes `bg-ink-950 bg-ink-900 bg-ink-800 border-ink-border text-paper text-paper-muted text-signal bg-signal font-grotesk font-mono`.

- [ ] **Step 1: Check if the homepage plan already landed these tokens.** Run `grep -n "ink\|signal\|grotesk" tailwind.config.js`. If all tokens from Global Constraints are present, mark this task complete and skip to Task 0.2. Otherwise continue.
- [ ] **Step 2: Write the failing test** — copy the `theme tokens` test verbatim from the homepage plan Task 1 (`tests/config/theme-tokens.test.ts`).
- [ ] **Step 3: Run it** — `npm run test -- tests/config/theme-tokens.test.ts` → FAIL.
- [ ] **Step 4: Add the `ink`/`paper`/`signal` colors and `grotesk`/`mono` fonts** to `tailwind.config.js` with the exact hex/family values in Global Constraints; add the `Space Grotesk` + `IBM Plex Mono` font links to `BaseLayout.astro`.
- [ ] **Step 5: Run test → PASS. Commit** `feat(theme): add ink/signal identity tokens for tool page`.

### Task 0.2: Static hero prototype + approval

**Files:**

- Create: `docs/superpowers/plans/proto/tool-hero.html` (throwaway static prototype, deleted after approval)

- [ ] **Step 1:** Build a static HTML prototype of the new hero using the `ink`/`signal`/`getScoreColor`/mono tokens, showing for Linear: logo + name, a **score dial (82, green) with the verdict label**, a one-line verdict sentence, the best-for / not-for / main-risk / upgrade-trigger block, a single "Last verified Jun 16 2026" line, and a **calm secondary** "Visit Linear ↗" text link (not a filled bar). Include a mobile (375px) and desktop (1440px) frame.
- [ ] **Step 2:** Screenshot both frames; present to the user for approval. Capture the approved layout decisions (score dial vs bar, where best-for/not-for sit, CTA treatment) as a short "Approved composition" note appended to this plan file.
- [ ] **Step 3:** On approval, delete the prototype file. **Do not commit the prototype.** Gate: do not start Phase 3 until this note exists.

---

## Phase 1 — Score & verdict contract (presentation seam)

### Task 1.1: Audit displayable-score coverage (DATA GATE)

**Files:**

- Create: `scripts/audit-tool-score-coverage.ts`

**Interfaces:**

- Produces: a decision recorded in this plan: **Path A** (scores resolvable from existing data → presentation-only) or **Path B** (must backfill).

- [x] **Step 1:** Write `scripts/audit-tool-score-coverage.ts` using `supabaseAdmin` from `@/lib/supabase` to print: count of `tools` with non-null `base_score`; count of published `tools` whose related `reviews` have a non-null `score`; and the join coverage (tools with at least one of the two).
- [x] **Step 2:** Run `npx tsx scripts/audit-tool-score-coverage.ts`. Record the numbers in this plan under a "Score coverage" note.
- [x] **Step 3: Branch.**
  - If ≥90% of published tools have a resolvable score from `reviews.score` (avg) or `base_score` → **Path A**: no backfill; Task 1.2 resolves from existing data. Skip Task 1.3.
  - Else → **Path B**: keep Task 1.3 (backfill) in scope.
- [x] **Step 4: Commit** `chore(audit): add tool score coverage audit script`.

**Score coverage, 2026-06-21:** Production contains 166 tool records. The `items`
table has no publish-status column, so this audit defines a published tool as a tool with
at least one `reviews.status = 'published'` row, matching the page's published-review
selection. There are 53 published tools, and all 53 have at least one scored published
review. No tool currently has `base_score`. Resolvable coverage is therefore 53/53
published tools (100.0%) and 53/166 tool records overall (31.9%). **Path A selected:**
no backfill or schema change is required. Tool records without a published scored review
continue to render the resolver's intentional null-score state.

### Task 1.2: `resolveToolVerdict()` — pure score+verdict resolver

**Files:**

- Create: `src/lib/tool-page/decision/tool-verdict.ts`
- Test: `tests/lib/tool-page/decision/tool-verdict.test.ts`

**Interfaces:**

- Consumes: `formatScore`, `truncateVerdict` from `@/lib/homepage`; `getScoreColor` from `@/lib/utils`; tool + reviews shapes from `@/types/database`.
- Produces:

  ```ts
  export interface ToolVerdict {
    score: number | null; // resolved 0-100 integer, or null if none
    scoreLabel: string | null; // getScoreColor(score).label, or null
    scoreColor: ReturnType<typeof getScoreColor> | null;
    verdictLine: string | null; // one-sentence verdict, <= 140 chars, no trailing fragment
    lastVerified: string | null; // human date or null
  }
  export function resolveToolVerdict(input: {
    baseScore: number | null;
    reviewScores: number[]; // contextual review.score values
    verdictText: string | null;
    lastCheckedISO: string | null;
  }): ToolVerdict;
  ```

  Resolution order for `score`: average of `reviewScores` (rounded) if any present, else `baseScore`, else `null`. `verdictLine` = `truncateVerdict(verdictText, 140)`, returning `null` if the result is empty or ends mid-word without terminal punctuation after truncation-cleanup.

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { resolveToolVerdict } from '@/lib/tool-page/decision/tool-verdict';

describe('resolveToolVerdict', () => {
  it('averages review scores over base_score', () => {
    const v = resolveToolVerdict({
      baseScore: 50,
      reviewScores: [80, 84],
      verdictText: 'Great for fast teams.',
      lastCheckedISO: null,
    });
    expect(v.score).toBe(82);
    expect(v.scoreLabel).toBe('Good');
    expect(v.scoreColor?.text).toBe('text-green-400');
  });
  it('falls back to base_score when no review scores', () => {
    expect(
      resolveToolVerdict({
        baseScore: 88,
        reviewScores: [],
        verdictText: null,
        lastCheckedISO: null,
      }).score
    ).toBe(88);
  });
  it('returns null score when nothing resolves', () => {
    expect(
      resolveToolVerdict({
        baseScore: null,
        reviewScores: [],
        verdictText: null,
        lastCheckedISO: null,
      }).score
    ).toBeNull();
  });
  it('trims verdict to one clean sentence', () => {
    const v = resolveToolVerdict({
      baseScore: 70,
      reviewScores: [],
      verdictText:
        'Linear is fast and opinionated; it suits product teams who want speed over configurability and dislike Jira.',
      lastCheckedISO: null,
    });
    expect(v.verdictLine!.length).toBeLessThanOrEqual(140);
    expect(/[.!?]$/.test(v.verdictLine!)).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (`tool-verdict` not found).
- [ ] **Step 3: Implement** `resolveToolVerdict` per the Interfaces contract.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat(tool-page): add resolveToolVerdict score+verdict resolver`.

### Task 1.3: (Path B only) score backfill RPC (SKIPPED)

**Files:**

- Migration via `mcp__supabase__apply_migration` name `backfill_tool_base_score`
- Modify: `src/lib/hunter/phases/persistence.ts` (persist `base_score` derived from `base_score_breakdown` average on upsert)
- Test: `tests/lib/hunter/base-score-derivation.test.ts`

- [x] **Step 1:** Path A was selected in Task 1.1. No backfill is required.
- [ ] **Step 2: Write failing test** for a pure `deriveBaseScore(breakdown: BaseScoreBreakdown): number | null` (average of present 0-100 dimensions, rounded; `null` if all absent). Place the helper in `src/lib/hunter/phases/analysis.ts` and export it.
- [ ] **Step 3: Run → FAIL. Implement `deriveBaseScore`. Run → PASS.**
- [ ] **Step 4:** Wire `deriveBaseScore` into persistence upsert so new hunts populate `base_score`; add a one-time SQL backfill migration computing `base_score` from `base_score_breakdown` for existing rows where `base_score IS NULL AND base_score_breakdown IS NOT NULL`. Run `npm run types:db` after the migration.
- [ ] **Step 5: Commit** `feat(hunter): derive and backfill tool base_score`.

---

## Phase 2 — Pipeline content-quality fix (root cause of broken/templated copy)

> Root cause confirmed at `src/lib/hunter/services/gemini.ts:924-967`: `enforceDecisionUsefulClaim()` prefixes claims lacking a "scenario signal" with `Can block teams that require ${lowercaseFirst(next)}`, and `rewriteLowSpecificityClaim()` substitutes canned strings. Chained with the verdict's "Avoid where " lead, this produces grammatically broken sentences shipped to production.

### Task 2.1: Stop Frankenstein claim prefixing

**Files:**

- Modify: `src/lib/hunter/services/gemini.ts` (`enforceDecisionUsefulClaim`, `rewriteLowSpecificityClaim`, ~924-967)
- Test: `tests/lib/hunter/claim-shaping.test.ts`

**Interfaces:**

- The two helpers must be exported (or extracted to `src/lib/hunter/content-policy/claim-shaping.ts` and imported back) so they are unit-testable in isolation.

- [ ] **Step 1: Write failing tests** asserting the regression cases:

```ts
import { describe, it, expect } from 'vitest';
import {
  enforceDecisionUsefulClaim,
  rewriteLowSpecificityClaim,
} from '@/lib/hunter/content-policy/claim-shaping';

describe('claim shaping never produces double-clause Frankenstein copy', () => {
  it('does not prefix a claim that already contains a clause verb', () => {
    const out = enforceDecisionUsefulClaim(
      'reports indicate constraints or workflow limits',
      'cons',
      'community'
    );
    expect(out).not.toMatch(/block teams that require reports indicate/i);
    expect(out).not.toMatch(/that require .* indicate/i);
  });
  it('drops (returns empty) a claim too generic to shape, instead of stitching', () => {
    expect(rewriteLowSpecificityClaim('great tool', 'pros', 'community')).toBe('');
  });
  it('leaves an already decision-shaped claim untouched', () => {
    const c = 'Best for teams that need native API access on the free tier.';
    expect(enforceDecisionUsefulClaim(c, 'pros', 'official')).toBe(c);
  });
});
```

- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Refactor.** Extract both helpers to `src/lib/hunter/content-policy/claim-shaping.ts`. Replace the prefixing branch: a claim that already begins with a clause/verb phrase is never wrapped in "Can block teams that require …"; instead, if a claim lacks scenario signal AND cannot be cleanly framed (no safe single-clause rewrite), `rewriteLowSpecificityClaim` returns `''` (caller drops it). Keep canned fallbacks only as a last-resort _when zero valid claims survive_, and have callers route dropped claims to the existing low-specificity drop path rather than display.
- [ ] **Step 4:** Update `gemini.ts` callers to filter out `''` results before persistence.
- [ ] **Step 5: Run → PASS. Commit** `fix(hunter): stop stitching broken multi-clause claims`.

### Task 2.2: Prompt the model to emit decision-shaped claims

**Files:**

- Modify: `src/lib/hunter/prompts/registry.ts` (or the synthesis prompt that produces pros/cons + verdict)
- Test: `tests/lib/hunter/evals/decision-claims.eval.test.ts` (extend existing eval harness in `src/lib/hunter/evals/`)

- [ ] **Step 1:** Locate the synthesis prompt producing `pros`/`cons`/`verdict`. Write/extend an eval fixture (golden) asserting outputs are single-sentence, scenario-anchored ("Best for…", "Not for…", "Can't … on the free tier"), and contain no "validated against source documentation" filler.
- [ ] **Step 2:** Tighten the prompt instructions: every pro/con is ONE sentence naming a who/when and a consequence; never emit hedge phrases; verdict is one sentence ≤140 chars. Re-run the eval harness (`scoreAnalysisAgainstGolden`).
- [ ] **Step 3: Commit** `feat(hunter): prompt model for decision-shaped single-sentence claims`.

### Task 2.3: Guarantee the canonical decision snapshot; deprecate legacy verdict narrative

**Files:**

- Modify: pipeline analysis output assembly so `heroDecisionCard` fields (`bestFor`, `notFor`, `mainRisk`, `upgradeTrigger`) are always populated from structured claims (not a free-text "verdict" blob).
- Modify: `src/lib/tool-page/decision/verdict-policy.ts` and `decision-utility.ts` to stop generating the legacy narrative when a canonical snapshot exists.
- Test: `tests/lib/tool-page/decision/verdict-policy.test.ts`

- [ ] **Step 1: Write failing test** asserting that when `bestFor`/`notFor`/`mainRisk` are present, `showLegacyVerdictNarrative` resolves `false` and the canonical snapshot is the single source.
- [ ] **Step 2: Run → FAIL. Implement** the policy change (canonical snapshot wins; legacy narrative only for legacy rows with no structured fields, behind a deprecation warning log).
- [ ] **Step 3: Run → PASS. Commit** `refactor(tool-page): prefer canonical decision snapshot over legacy verdict`.

---

## Phase 3 — Hero verdict instrument + single decision path

> Gated on Phase 0.2 approval and Phase 1.2.

### Task 3.1: `ToolVerdictInstrument.astro`

**Files:**

- Create: `src/components/tool-page/ToolVerdictInstrument.astro`
- Test: `tests/components/tool-verdict-instrument.test.ts` (render-to-string assertion via the existing rendered-page test pattern, or a structural snapshot)

**Interfaces:**

- Consumes: `ToolVerdict` (Task 1.2) + `ToolPageHeroDecisionCard` fields (`bestFor`, `notFor`, `mainRisk`, `upgradeTrigger`) + tool name/logo + a calm CTA href.
- Props:

  ```ts
  interface Props {
    verdict: ToolVerdict;
    bestFor: string | null;
    notFor: string | null;
    mainRisk: string | null;
    upgradeTrigger: string | null;
    toolName: string;
    visitHref: string | null;
  }
  ```

- [ ] **Step 1: Write a structural test** asserting: the rendered output contains the integer score in a `font-mono` element, the `getScoreColor(score).label`, the `verdictLine`, a "Best for"/"Not for"/"Main risk" trio, exactly one "Last verified" string, and that the visit link is a text/ghost link (no `bg-amber`/`bg-signal` fill class on it).
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Build the component** per the Phase 0 approved composition: score dial colored by `scoreColor`, mono numerals, `font-grotesk` tool name, decision trio, single freshness line, ghost CTA. No score when `verdict.score === null` (show verdict line + trio only).
- [ ] **Step 4: Run → PASS. Commit** `feat(tool-page): add ToolVerdictInstrument hero component`.

### Task 3.2: Mount instrument in the hero; demote the CTA; remove the empty right column

**Files:**

- Modify: `src/pages/tool/[slug].astro` (hero block ~188-424)

- [ ] **Step 1:** Replace the `aside` sidebar CTA stack (`405-421`) and the separate `ToolImmediateVerdictCard` mount with `ToolVerdictInstrument` filling the hero's right column (currently empty on Linear). Move `AffiliateButton` out of the hero's primary action row into a calm inline link; keep `CompareButton`/`AddToStackButton` as secondary.
- [ ] **Step 2:** Delete the standalone "Best fit, main risk, and upgrade trigger" legacy section render (`466-539`) and the `showVerdictEvidenceNotesOnly` duplicate (`541-589`) — evidence notes fold into a single `<details>` inside the instrument or the methodology section.
- [ ] **Step 3:** Run `npm run build`; visually verify Linear and ChatGPT heroes now both lead with the instrument (no blank column, no full-width amber bar above the verdict). Screenshot both.
- [ ] **Step 4: Commit** `feat(tool-page): lead hero with verdict instrument, demote CTA`.

---

## Phase 4 — Shed sprawl, hedging, and redundancy

### Task 4.1: Collapse hedging into one freshness line

**Files:**

- Create: `src/lib/tool-page/evidence/freshness-line.ts` (single resolver returning `Last verified <date>` or `null`)
- Modify: components emitting `Pending verification` / `Data confidence` / `Not confirmed` / `Evaluation depth` (`TrustBar.astro`, `ToolHowWeEvaluateSection.astro`, `update-history-state.ts`, pricing notice, `compactTrustStrip` tooltip)
- Test: `tests/lib/tool-page/evidence/freshness-line.test.ts`

- [ ] **Step 1: Write failing test** for `resolveFreshnessLine({ lastCheckedISO, status })` → `'Last verified Jun 16 2026'` or `null`; never the banned hedge strings.
- [ ] **Step 2: Implement; run → PASS.**
- [ ] **Step 3:** Replace scattered confidence/freshness UI with the single line (in the instrument + one optional methodology `<details>`). Remove `Data confidence: Medium`, `Pending verification`, `Last update Not confirmed / Last check Not confirmed`, `Evaluation depth: Docs only` from default render.
- [ ] **Step 4:** Add a rendered-page guard test asserting the banned hedge strings (Global Constraints) do not appear in `/tool/linear` output outside a `<details>`/freshness line.
- [ ] **Step 5: Commit** `refactor(tool-page): collapse hedging into one freshness line`.

### Task 4.2: Cut/merge empty + duplicate sections

**Files:**

- Modify: `src/pages/tool/[slug].astro` (sections: How We Evaluated 118/`ToolHowWeEvaluateSection`, Update History `hasUpdateHistorySection`, nested "What Users Report" in Strengths 887-903, alternatives 1226-1300)

- [ ] **Step 1:** Hide "How We Evaluated" and "Update History" when their only content is "Docs only" / "Not confirmed" (gate on real content presence, not `true`). `hasHowWeEvaluatedSection = true` (line 118) becomes a real predicate.
- [ ] **Step 2:** Merge the nested "User-Reported Signals" pros/cons into the main `ProsCons` with a per-row "community" badge instead of a second stacked pros/cons block.
- [ ] **Step 3:** Alternatives: keep ONE representation. Remove either the `AlternativesCompareGrid` _or_ the per-card grid + rebuttal cards (recommend: keep the compare grid as the scannable default, fold rebuttals into each grid row's "choose instead if"). Remove the other two stacked renders.
- [ ] **Step 4:** `npm run build`; screenshot Linear full page; confirm section count dropped and no empty headings remain.
- [ ] **Step 5: Commit** `refactor(tool-page): cut empty sections and dedupe alternatives`.

### Task 4.3: Default-open the decision-critical sections; reduce accordion wall

**Files:**

- Modify: `src/pages/tool/[slug].astro` (pricing `details` 594, strengths already `open`, specs `details` 920, operational details 1070, about 1012)

- [ ] **Step 1:** Keep Pricing and Strengths open by default; keep Specs/Operational/About collapsed (reference). Ensure the jump-rail (`renderedJumpLinks`) reflects the trimmed section set from Task 4.2.
- [ ] **Step 2:** `npm run build`; verify a first-time reader sees verdict → pricing → strengths without expanding anything.
- [ ] **Step 3: Commit** `refactor(tool-page): default-open decision-critical sections`.

---

## Phase 5 — QA, accessibility, and gates

### Task 5.1: Accessibility + responsive + reduced motion

**Files:**

- Modify: `ToolVerdictInstrument.astro` and touched components
- Test: extend rendered-page checks

- [ ] **Step 1:** Verify score dial has an accessible label (`aria-label="Score 82 of 100, Good"`), CTA link has visible focus ring, decision trio is a real list, color is never the sole carrier of fit/score meaning (label text accompanies color).
- [ ] **Step 2:** Test at 375px and 1440px; ensure hero stacks (instrument below header) on mobile and the CTA remains reachable.
- [ ] **Step 3:** Honor `prefers-reduced-motion` on any hover/transition added.
- [ ] **Step 4: Commit** `fix(tool-page): a11y + responsive verdict instrument`.

### Task 5.2: Run the full gate set and rendered-page tests

- [ ] **Step 1:** `npm run typecheck` → clean.
- [ ] **Step 2:** `npm run build` → succeeds.
- [ ] **Step 3:** `npm run test` → all pass (including new claim-shaping, verdict resolver, freshness-line, hedge-guard, instrument tests).
- [ ] **Step 4:** Run the project gates available via `mcp__stackhuntGates__*` if applicable: `gate_content`, `gate_design_pass`, `gate_links`, `gate_lhci`. Record results.
- [ ] **Step 5:** Update any rendered-page source-path tests (cf. recent commit `test(qa): update rendered page source paths`) for the changed section structure.
- [ ] **Step 6: Commit** `test(tool-page): update gates and rendered-page checks for redesign`.

---

## Self-Review checklist (run before execution)

- **Spec coverage:** verdict instrument (3.1/3.2) ✓; CTA demotion (3.2) ✓; pipeline broken-copy fix (2.1/2.2) ✓; legacy verdict path removal (2.3/3.2) ✓; hedging collapse (4.1) ✓; sprawl/redundancy (4.2/4.3) ✓; score surfacing (1.1/1.2/1.3) ✓; identity/data-color separation (0.1, Global Constraints) ✓.
- **Open dependency:** Phase 0.1 tokens may be delivered by the homepage plan first — Task 0.1 Step 1 handles the idempotency.
- **Data risk:** Task 1.1 is a hard gate — if score coverage is poor, Path B (1.3) is mandatory before 3.1 can show a number; 3.1 already handles `score === null` gracefully.
- **Decision recorded:** decision-authority (not affiliate) — enforced by the CTA-demotion constraint and Task 3.2.

---

## Approved composition (Phase 0.2 — approved 2026-06-20)

Hero verdict instrument, locked:

- **Signature element:** circular score dial — integer score in IBM Plex Mono, arc + numerals colored by `getScoreColor(score)` (functional scale, e.g. green for 82). NOT brand amber.
- **Verdict label:** `getScoreColor` word + buy term, e.g. "Good · Strong buy" (KEEP the buy term).
- **Sub-scores:** small labeled bars from `base_score_breakdown` (Features/UX/Value/Support) under the dial. Gated on breakdown data (Task 1.1).
- **Verdict line:** one sentence leads the text column; tool name in Space Grotesk.
- **Decision strip:** Best for / Not for / Main risk (rose label) / Upgrade trigger (amber label) in one row.
- **Freshness:** single "Last verified <date> · N sources" line (replaces all scattered hedges).
- **CTA demoted:** Compare / Add to stack as ghost buttons; "Visit <domain> ↗" as a small amber underline link — never a full-width filled bar above the verdict.
- Mobile: text + dial stack; decision strip becomes 2×2.
