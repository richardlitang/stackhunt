# Feature: Authentic FAQs From Reddit/Forums/PAA

Last verified: 2026-03-05

## Goal
Replace synthetic FAQ content with “actually asked” questions sourced during ETL and render them on /tool pages with matching FAQ schema.

## Architecture Overview
Extend the research phase to capture real questions from Reddit, forums, and “People Also Ask.” Persist them in the knowledge card (`metadata`) for each tool. Update the tool page to render these FAQs and generate FAQ schema from the stored items only.

## Tech Stack
- Astro pages (`src/pages/tool/[slug].astro`)
- Hunter pipeline (`src/lib/hunter/phases/research.ts`, `src/lib/hunter/phases/analysis.ts`)
- Knowledge card typing (`src/lib/knowledge-card`, `src/types/database.ts`)
- SEO schema helpers (`src/lib/seo.ts`)

## Tasks

### Task 1: Locate current research extraction points for Reddit/forums/PAA
**Files:**
- Inspect: `src/lib/hunter/phases/research.ts`
- Inspect: `src/lib/hunter/services/serper.ts`
- Inspect: `src/lib/hunter/services/*`

**Action:** Identify where search results and snippets are parsed and where to attach FAQ extraction. Document the specific function(s) to extend.

**Verify:**
```bash
rg -n "reddit|forum|people also ask|paa|questions" -S src/lib/hunter
```

**Commit:** `chore(hunter): locate faq extraction points`

---

### Task 2: Define FAQ structure in knowledge card
**Files:**
- Modify: `src/lib/knowledge-card/index.ts` (or equivalent)
- Modify: `src/types/database.ts`

**Action:** Add a `faqs` array to the knowledge card schema:
```ts
faqs?: Array<{ question: string; answer: string; source: 'reddit' | 'forum' | 'paa'; source_url?: string }>;
```

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(knowledge-card): add faq schema for extracted questions`

---

### Task 3: Extract real FAQs during research
**Files:**
- Modify: `src/lib/hunter/phases/research.ts`
- Modify: `src/lib/hunter/services/serper.ts` (if needed)

**Action:**
- From Reddit/forum results: extract question-like titles or headings and a short answer (snippet). Map to `source` and `source_url`.
- From PAA results: use question + snippet as answer.
- De-duplicate by question text, keep top 3–6 by source priority (PAA > forum > reddit) or by relevance score.
- Store into `knowledgeCard.faqs`.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): extract authentic faqs from research sources`

---

### Task 4: Render stored FAQs and generate matching schema
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/seo.ts`

**Action:**
- Use only `knowledgeCard.faqs` for visible FAQ content.
- Update `generateToolFAQSchema` to use `knowledgeCard.faqs` and return null when none.
- Remove synthetic FAQ fallback on the page.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): render authentic faqs and align schema`

---

### Task 5: Guardrails and limits
**Files:**
- Modify: `src/lib/hunter/phases/research.ts`

**Action:**
- Cap FAQs to a safe limit (e.g., 5).
- Ensure answers are concise (truncate to ~200 chars).
- Sanitize/strip markdown or unsafe content.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `chore(hunter): cap and sanitize extracted faqs`

---

## Human Checkpoint
- After this plan: confirm structure, data model, and extraction rules before coding.

