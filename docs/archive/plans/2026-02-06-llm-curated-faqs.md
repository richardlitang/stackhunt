# Feature: LLM-Curated FAQs

Last verified: 2026-03-05

## Goal
Curate up to 5 “important” FAQs using the LLM’s synthesis context, rather than blindly using raw PAA/forum/Reddit questions.

## Architecture Overview
Continue scraping candidate questions in the research phase (PAA/forums/Reddit), then pass those candidates into the analysis phase. Update the analysis prompt/schema so the LLM selects the 5 most relevant questions and rewrites concise answers, ideally with source URLs. Persist only curated FAQs in the knowledge card and render them on /tool pages.

## Tech Stack
- Hunter pipeline (research → analysis)
- Gemini prompts (`src/lib/hunter/services/prompts.ts`, `src/lib/hunter/prompts/*.ts`)
- Knowledge card schema (`src/lib/knowledge-card.ts`)
- Tool page (`src/pages/tool/[slug].astro`)

## Tasks

### Task 1: Locate analysis prompt and output schema for FAQ addition
**Files:**
- Inspect: `src/lib/hunter/services/prompts.ts`
- Inspect: `src/lib/hunter/prompts/*`
- Inspect: `src/lib/hunter/phases/analysis.ts`

**Action:** Identify where to inject FAQ candidates into the synthesis prompt and where to parse structured output.

**Verify:**
```bash
rg -n "synthesize|analysis|prompt" -S src/lib/hunter
```

**Commit:** `chore(hunter): locate synthesis prompt integration points`

---

### Task 2: Extend analysis output schema to include curated FAQs
**Files:**
- Modify: `src/lib/hunter/types.ts`
- Modify: `src/lib/hunter/services/gemini.ts` (if schema defined there)
- Modify: `src/lib/hunter/prompts/*` (schema definition)

**Action:** Add `faqs` to analysis output:
```ts
faqs?: Array<{ question: string; answer: string; source_url?: string; source_type?: 'reddit' | 'forum' | 'paa' | 'official' | 'editorial' }>
```

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): add curated faq output schema`

---

### Task 3: Feed FAQ candidates into the analysis prompt
**Files:**
- Modify: `src/lib/hunter/phases/analysis.ts`
- Modify: `src/lib/hunter/services/prompts.ts`

**Action:**
- Pass `scoutResult.faqs` into the synthesis prompt under a dedicated section.
- Add instructions: choose top 5 most relevant questions; rewrite short answers; include source_url when possible.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): feed faq candidates into synthesis prompt`

---

### Task 4: Persist curated FAQs to knowledge card
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
- Prefer `analysis.faqs` if present; fall back to `research.scoutResult.faqs` if empty.
- Store in `knowledgeCard.faqs`.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): persist curated faqs into knowledge card`

---

### Task 5: Ensure tool page renders curated FAQs only
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/seo.ts`

**Action:**
- Ensure FAQ rendering and schema use `knowledgeCard.faqs` only (no synthetic fallback).

**Verify:**
```bash
npm run typecheck
```

**Commit:** `chore(tool-page): align faq display with curated data`

---

## Human Checkpoint
- After this plan: confirm the schema changes and prompt wording before coding.

