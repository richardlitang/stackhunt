# Non-Tool Workflows Audit

**Date:** 2026-01-31
**Focus:** Review workflows beyond basic tool hunting

---

## Current State

### ✅ What's Working

**1. Content Ideas Pipeline (Strategy Gatekeeper)**
- ✅ 229 content ideas in system
- ✅ Import script working (`import-content-ideas.ts`)
- ✅ Queue script working (`queue-content-ideas.ts`)
- ✅ Status workflow: pending → queued → processed
- ⚠️  **Gap:** 169 pending ideas not analyzed/approved

**2. Contexts ("Best X for Y" pages)**
- ✅ 35 contexts created
- ✅ Page rendering at `/best/[slug]`
- ✅ Recent activity (Gaming Communities, Video Meetings added 1/31)
- ⚠️  **Gap:** No automated context generation from content ideas
- ⚠️  **Gap:** No bulk context creation workflow

**3. Reviews (Contextual Tool Analysis)**
- ✅ 47 reviews published
- ✅ All reviews in "published" status
- ✅ Hunter creates reviews when context_title provided
- ⚠️  **Gap:** No script to bulk-generate reviews for existing contexts

**4. Categories (Knowledge Graph)**
- ✅ 66 categories in system
- ✅ Three types: function, audience, platform
- ✅ Auto-linking during hunt (persistence phase)
- ⚠️  **Gap:** No category analytics (which are underutilized?)
- ⚠️  **Gap:** No category consolidation tool (merge duplicates)

**5. Comparison Pages**
- ✅ Compare endpoint exists (`/compare/[slug1]-vs-[slug2]`)
- ✅ Recent commit added compare feature (b92e36a)
- ⚠️  **Gap:** No bulk comparison generation
- ⚠️  **Gap:** No comparison suggestions based on competitors

---

## 🚨 Critical Gaps

### 1. **Context Generation Workflow**

**Problem:** Content ideas don't automatically flow to contexts

**Current Flow:**
```
content_ideas (pending) → manual approval → queued → hunt_queue → tool hunt
```

**Missing:**
```
content_ideas → auto-create context → generate reviews for existing tools
```

**Impact:** 169 pending content ideas sitting unused

**Fix Needed:**
- Script to auto-create contexts from approved content ideas
- Bulk review generation for context + existing tools
- Example: "best crm for startups" → create context → review all CRM tools in that context

---

### 2. **Review Backfill**

**Problem:** Only 47 reviews for 35 contexts

**Math:**
- Tools in DB: ~65 processed
- Contexts: 35
- Potential reviews: 35 × 65 = 2,275
- Actual reviews: 47
- **Coverage: 2%**

**Fix Needed:**
- Script to backfill reviews: for each context, review all relevant tools
- Relevance filter: only review tools that match context criteria
- Example: Context "Best for Startups" → review tools tagged with "Startups" audience

---

### 3. **Category Utilization**

**Problem:** 66 categories exist but no visibility into usage

**Missing:**
- Which categories have 0 tools?
- Which categories are duplicates? ("SEO" vs "SEO & Analytics")
- Which categories should be merged?

**Fix Needed:**
- Category analytics script
- Category merge/consolidate tool
- Unused category cleanup

---

### 4. **Comparison Generation**

**Problem:** Comparison pages exist but no automated generation

**Opportunity:**
- For each tool, auto-generate comparisons with its top 3 competitors
- Use `specs.competitors` field from knowledge cards
- Example: Notion → auto-create Notion vs Coda, Notion vs Obsidian, Notion vs Evernote

**Fix Needed:**
- Bulk comparison generation script
- Use existing tool data + competitor lists
- No AI needed - use existing reviews/specs

---

### 5. **Content Ideas → Hunt Queue Flow**

**Problem:** 60 "queued" content ideas but 0 new items in hunt_queue

**This means:**
- Content ideas were queued in the past
- They created hunt_queue items
- Those items were processed
- But status wasn't synced back to "completed"

**Fix Needed:**
- Add "completed" status to content_ideas
- Sync status after hunt completes
- Better workflow: pending → approved → queued → completed

---

## 📊 Data Quality Issues

### Missing Fields in Existing Data

**Items (Tools):**
- ✅ review_context added (budgetAnalyst, userAdvocate, humanVerdict)
- ✅ target_audience added to pricing plans (Batch 4+)
- ⚠️  Batches 1-3 (50 items) missing target_audience - needs backfill

**Contexts:**
- ⚠️  No embedding for semantic search
- ⚠️  No view_count or popularity metrics
- ⚠️  No related_contexts linking

**Reviews:**
- ⚠️  All status "published" - no draft workflow
- ⚠️  No review_date field
- ⚠️  No helpful_count (user feedback)

---

## 🛠️ Scripts Needed

### High Priority

1. **`generate-contexts-from-ideas.ts`**
   - Read approved content_ideas
   - Create contexts from keywords
   - Update content_ideas status to "completed"

2. **`backfill-reviews.ts`**
   - For each context, find relevant tools
   - Generate reviews using existing tool data + context
   - No new AI analysis needed - use existing specs

3. **`analyze-categories.ts`**
   - Count tools per category
   - Find unused categories
   - Identify duplicates
   - Suggest merges

4. **`generate-comparisons.ts`**
   - For each tool, read competitors list
   - Create comparison pages for top 3 competitors
   - Use existing review data

5. **`sync-content-idea-status.ts`**
   - Check hunt_queue completion
   - Update content_ideas to "completed" if hunt succeeded
   - Clean up stale "queued" status

### Medium Priority

6. **`backfill-target-audience.ts`**
   - Re-process Batches 1-3 (50 items)
   - Add target_audience to pricing plans
   - Use existing specs, just re-run Gemini extraction

7. **`consolidate-categories.ts`**
   - Interactive merge tool
   - Reassign tools to consolidated categories
   - Delete unused categories

8. **`generate-embeddings.ts`**
   - Add embeddings to contexts for semantic search
   - Add embeddings to reviews for similarity

---

## 📈 Metrics to Track

**Context Coverage:**
- How many contexts exist per category?
- Which categories have 0 contexts?

**Review Coverage:**
- How many tools reviewed in each context?
- Which contexts have <3 reviews?

**Comparison Coverage:**
- How many comparisons exist?
- Which popular tools have 0 comparisons?

**Content Ideas Conversion:**
- pending → approved rate
- approved → queued rate
- queued → completed rate

---

## 🎯 Recommended Action Plan

### Phase 1: Data Quality (Week 1)
1. Run `backfill-target-audience.ts` on Batches 1-3
2. Run `sync-content-idea-status.ts` to clean up queued items
3. Run `analyze-categories.ts` to understand current state

### Phase 2: Content Generation (Week 2)
1. Build `generate-contexts-from-ideas.ts`
2. Process 35 approved content ideas → create contexts
3. Build `backfill-reviews.ts`
4. Generate reviews for existing tools in new contexts

### Phase 3: Comparison Pages (Week 3)
1. Build `generate-comparisons.ts`
2. Generate comparisons for top 20 tools
3. Test comparison page rendering

### Phase 4: Workflow Improvements (Week 4)
1. Add embedding generation to context creation
2. Add status sync to hunt completion
3. Add category analytics dashboard

---

## 💡 Key Insights

**Tool-Focused Bias:**
- 100% of recent effort on tool hunting
- Context/review/comparison workflows neglected
- Content ideas pipeline underutilized (169 pending)

**Opportunity:**
- 2,275 potential reviews (35 contexts × 65 tools)
- 195+ potential comparisons (65 tools × 3 competitors)
- 169 content ideas ready to convert

**Impact:**
- **10x content volume** with existing data
- **No additional AI costs** (use existing specs)
- **Better SEO coverage** (more "best X for Y" pages)

---

*Generated: 2026-01-31*
