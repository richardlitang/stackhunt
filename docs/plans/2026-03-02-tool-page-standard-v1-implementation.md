# Feature: Tool Page Standard v1 Implementation

Last verified: 2026-03-05

## Goal
Implement Tool Page Standard v1 on `/tool/[slug]` so pages are decision-first, evidence-safe, and pass a strict publish/index gate.

## Architecture Overview
We will enforce the standard in four layers: data contract (`tool page evidence contract`), render contract (`tool/[slug].astro`), generation fallback contract (`hunter/persistence.ts`), and machine-enforced QA gate (`lib/tool-page-qa-gate.ts` + tests + scripts). SEO/schema parity will be tightened in `lib/seo.ts` and the tool page route, while keeping compatibility with existing quality-gate and strict-publish-gate logic.

## Tech Stack
- Astro route rendering: `src/pages/tool/[slug].astro`
- Existing gates: `src/lib/quality-gate.ts`, `src/lib/review-publish-gate.ts`
- SEO/schema generators: `src/lib/seo.ts`
- Hunter synthesis fallback: `src/lib/hunter/phases/persistence.ts`
- Unit tests: Vitest in `tests/lib/*`
- QA script runner: `scripts/*.ts`

## Constraints
- Tool pages first. Do not refactor `/best` and `/compare` in this pass.
- Keep changes minimal and additive where possible.
- Preserve existing legal guardrails.

## Tasks

### Task 0: Add Tool Page Evidence Contract (Upstream Data Contract)
**Files:**
- Create: `src/lib/tool-page-evidence-contract.ts`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
Add a shared contract object consumed by route + persistence:
- `pageType: "tool_review"`
- `primaryIntent`
- `evaluationDepth: "docs_only" | "hands_on" | "mixed"`
- `factFields[]`
- `sourceTypeByField`
- `confidenceByField`
- `lastCheckedByField`
- `sectionReasonCodes`
- `sectionOmissionReasons`

Require route assembly to consume this contract instead of inferring only from loose blobs.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): add upstream evidence contract`

---

### Task 1: Add Tool-Page QA Gate Library
**Files:**
- Create: `src/lib/tool-page-qa-gate.ts`

**Action:**
Add a deterministic pass/fail function:
- Input: title, h1, intro, verdict text, section state, pricing evidence state, schema parity flags, freshness flags.
- Output: `{ pass: boolean, blockers: string[], warnings: string[], metrics: {...} }`.
- Include banned generic phrase list (from standard doc), with exact blocker keys.
- Add `evidenceDepthLabel` enforcement:
  - `docs_only` blocks un-attributed experiential claims
  - `hands_on` allows experiential claims
  - `mixed` requires explicit labeling

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): add v1 qa gate evaluator`

---

### Task 2: Add Unit Tests for QA Gate
**Files:**
- Create: `tests/lib/tool-page-qa-gate.test.ts`

**Action:**
Add tests for:
- pass path with valid inputs
- fail on title/H1 intent mismatch
- fail on generic verdict phrase
- fail on missing pricing checked proof when pricing section is visible
- fail on schema-visible mismatch flag

**Verify:**
```bash
npm run test -- tests/lib/tool-page-qa-gate.test.ts
```

**Commit:** `test(tool-page): cover qa gate fail/pass conditions`

---

### Task 3: Wire QA Gate into Tool Route
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
Call `evaluateToolPageQaGate(...)` after existing gate computations.
- Merge blockers with current noindex logic.
- If any critical blocker exists: force `noindex` and render verification status.
- Store blocker list for optional admin/debug output (hidden from standard users).

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): enforce qa gate before index eligibility`

---

### Task 4: Fix Tool H1 Intent Alignment
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/seo.ts`

**Action:**
- Introduce title/H1/dek intent policy (not one hardcoded H1 string):
  - Title remains intent-rich review query target.
  - H1 must be clear, prominent, and intent-aligned, but may be concise.
  - Add/keep a visible dek/subhead for pricing/tradeoff/best-for framing.
- Ensure title + H1 + intro coherence.
- Keep canonical URL unchanged.

**Verify:**
```bash
npm run typecheck
npm run test -- tests/e2e/seo.spec.ts
```

**Commit:** `feat(seo): align tool h1 with review intent`

---

### Task 5: Remove Above-the-Fold Template Noise
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
From the hero/first viewport, remove or relocate:
- source-count tally block
- internal index explanation blocks
- published analyses count from primary decision area
Keep only decision-critical meta: best-for/not-for, pricing model, confidence, last checked, primary CTA.

**Verify:**
```bash
npm run build
npm run test -- tests/e2e/tool-pages.spec.ts
```

**Commit:** `refactor(tool-page): demote template chrome from top-of-page`

---

### Task 6: Enforce Required Section Order
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
Ensure preferred render order follows the standard:
1) decision block
2) why choose/why skip
3) pricing
4) alternatives
5) evidence/methodology
6) update history

Do not introduce new visual components; reorder existing sections where possible.
Use omission-aware ordering:
- suppressed sections should not leave visual holes
- weak-confidence pricing should not force awkward placement

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): enforce v1 decision section ordering`

---

### Task 7: Add Allowed-Section Contract Helper
**Files:**
- Create: `src/lib/tool-page-standard.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
Create helper that computes `allowedSections` from confidence + evidence + freshness + field completeness.
Use it to suppress optional sections by contract (FAQ, portability, security, integrations, community, setup).
Persist per-section omission reason codes, e.g.:
- `omitted_due_to_low_confidence`
- `omitted_due_to_missing_checked_date`
- `omitted_due_to_low_field_completeness`

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): add allowed-sections contract helper`

---

### Task 8: Remove Generic Verdict Fallback Language in Route
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
Replace generic fallback strings (for example “worth shortlisting”) with evidence-bound phrasing templates that require specific triggers/constraints.
If specific evidence is absent, show explicit unknown state (`Not confirmed`) instead of generic recommendation text.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `fix(tool-page): replace generic verdict fallback text`

---

### Task 8.5: Add Decision-First Intro Generator
**Files:**
- Create: `src/lib/tool-page-intro.ts`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
Add a small generator/formatter that guarantees a decision-first intro block with:
- one sentence: what it is
- one sentence: best for
- one sentence: not for
- one sentence: main tradeoff

Rules:
- no generic verdict phrases
- require concrete signal in both positive and negative direction
- return unknown-state copy if specificity threshold fails

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): add decision-first intro generator`

---

### Task 9: Harden Derived Summary/Verdict Builder
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
Update `buildDerivedVerdict` and `buildDerivedSummary`:
- require concrete claim text with source-backed constraints
- reject boilerplate choose/avoid strings when claims are weak
- return `null` when specificity threshold fails (route handles unknown state)

**Verify:**
```bash
npm run test -- tests/lib/hunter/schema-validator.test.ts
npm run typecheck
```

**Commit:** `fix(hunter): enforce specificity in derived verdict and summary`

---

### Task 10: Add Generic-Phrase Lint Script
**Files:**
- Create: `scripts/check-tool-page-copy-quality.ts`
- Modify: `package.json`

**Action:**
Implement script scanning rendered output (SSR HTML snapshots) for sampled real tool pages in decision/verdict/intro regions.
Add npm script alias, e.g. `qa:tool-copy`.

**Verify:**
```bash
npm run qa:tool-copy
```

**Commit:** `feat(qa): add tool-page copy quality lint`

---

### Task 11: Add Pricing Contradiction Check Script
**Files:**
- Create: `scripts/check-tool-pricing-consistency.ts`
- Modify: `package.json`

**Action:**
Implement checker for mismatches across:
- pricing model labels
- presence/absence of pricing checked date
- visible pricing claims when pricing proof is incomplete

Add npm alias `qa:tool-pricing`.

**Verify:**
```bash
npm run qa:tool-pricing
```

**Commit:** `feat(qa): add tool pricing consistency checker`

---

### Task 12: Tighten Schema Emission Contract
**Files:**
- Modify: `src/lib/seo.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
Pass visible-content capability flags into schema generation and suppress fields not represented on page.
Minimum:
- `SoftwareApplication` only includes fields with visible parity
- gate FAQ schema by strict eligibility flag

**Verify:**
```bash
npm run typecheck
npm run test -- tests/e2e/seo.spec.ts
```

**Commit:** `fix(schema): enforce tool schema visible-content parity`

---

### Task 13: Adjust Volatile Freshness Handling for Tool Page
**Files:**
- Modify: `src/lib/quality-gate.ts`

**Action:**
Introduce field-specific freshness windows used by tool-page QA gate inputs:
- pricing/limits/models tighter (7-14d)
- security/compliance 30d
- company facts 30-90d

Keep current default behavior for non-tool pages.

**Verify:**
```bash
npm run test -- tests/lib/compiler/publish-gate.test.ts
npm run typecheck
```

**Commit:** `feat(quality-gate): add field-specific freshness windows for tool pages`

---

### Task 14: Expose QA Gate Reasons in Admin Review Surface
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: relevant admin page under `src/pages/admin/*` (if already showing gate reasons)

**Action:**
Add non-public debug metadata showing failing tool-page QA blockers for admin preview mode.
Expand admin diagnostics to include field-level provenance and omission reasons:
- value
- source URL
- source type
- confidence
- last checked
- rendered-by section/component
- omission reason code

Do not expose blocker internals to public users.

**Verify:**
```bash
npm run build
```

**Commit:** `feat(admin): show tool-page qa blockers in preview mode`

---

### Task 15: Update Testing Quickstart for New Gate Commands
**Files:**
- Modify: `docs/TESTING_QUICKSTART.md`
- Modify: `docs/TOOL_PAGE_QA_GATE_V1.md` (automation section alignment)

**Action:**
Add canonical command sequence for tool-page gate validation:
- `npm run qa:tool-copy`
- `npm run qa:tool-pricing`
- `npm run typecheck`
- `npm run build`
- targeted e2e: tool + seo

**Verify:**
```bash
npm run qa:tool-copy && npm run qa:tool-pricing
```

**Commit:** `docs(testing): add tool-page qa command flow`

---

### Task 16: Search Monitoring Hooks for Structured Data and Indexing
**Files:**
- Modify: `docs/TESTING_QUICKSTART.md`
- Modify: `docs/TOOL_PAGE_QA_GATE_V1.md`

**Action:**
Add post-deploy monitoring checklist:
- structured data invalid item monitoring
- index coverage deltas for tool pages
- blocker-rate trend by reason code

**Verify:**
```bash
npm run qa:tool-copy && npm run qa:tool-pricing
```

**Commit:** `docs(qa): add post-deploy monitoring hooks`

---

### Task 17: End-to-End Verification Sweep
**Files:**
- No code changes expected unless failures are found

**Action:**
Run full verification for this feature branch.

**Verify:**
```bash
npm run typecheck
npm run build
npm run test
npm run test -- tests/e2e/tool-pages.spec.ts tests/e2e/seo.spec.ts
npm run qa:tool-copy
npm run qa:tool-pricing
```

**Commit:** `chore(qa): verify tool-page standard v1 rollout`

---

## Rollout Order
1. Task 0 then Tasks 1-4 (upstream contract + gate + intent alignment)
2. Tasks 5-9 (render and generation hardening + decision-first intro)
3. Tasks 10-13 (rendered-output automation + schema/freshness tightening)
4. Tasks 14-17 (admin provenance + monitoring + full verification)

## Risks
- Tightened gates may noindex more pages initially.
- Existing fallback copy may disappear when specificity is insufficient.
- Schema suppression may reduce rich-result eligibility short-term while improving compliance.

## Success Metrics
- 0 generic verdict blockers on sampled tool pages
- title/H1 intent mismatch rate = 0
- pricing contradiction blockers drop to near 0
- schema parity critical errors = 0
- higher publish confidence with explicit unknown handling

## Follow-on (Best/Compare, not in this implementation)
- Reuse `tool-page-qa-gate` patterns in `best` and `compare` with page-type-specific intent checks.
- Replace generic compare FAQ schema defaults with eligibility-gated logic.
- Apply one-job-to-be-done section contracts to list/compare templates.
