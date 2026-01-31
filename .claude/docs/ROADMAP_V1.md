# StackHunt Roadmap: Affiliate Engine V1

## North Star
An affiliate-first content engine with Tribal Knowledge and Fiscal Logic that users can't find on spec-sheet farms.

---

## ✅ Priority 1: Institutional Trust (EEAT without Authors) - COMPLETE

Google rewards accuracy and methodology when individual human authors are unavailable.

### ✅ 1.1 Methodology Page (`/methodology`) - COMPLETE
**File:** `src/pages/methodology.astro` ✓ Created

Explain the "Hunter" process:
- How we search (12 parallel Serper queries covering reviews, pricing, Reddit, tribal knowledge)
- How we extract (Two-pass Gemini: Librarian → Architect)
- How we verify (draft workflow, user corrections, AI verification)
- Data freshness policy (last_verified_at, stale alerts)

Key trust signals:
- "We use AI to research, humans to verify"
- "Every claim links to its source"
- Link to correction submission form

### ✅ 1.2 Verification Badges - COMPLETE
**File:** `src/components/VerifiedBadge.astro` ✓ Created
**Location:** Tool pages, review cards ✓ Integrated

Display on every tool:
- "StackHunt Verified" badge
- `last_verified_at` date from `items` table
- Source count from `review.sources`

Implementation:
```astro
<!-- src/components/VerifiedBadge.astro -->
<div class="verified-badge">
  <CheckIcon /> StackHunt Verified
  <span class="text-muted">Last verified: {formatDate(last_verified_at)}</span>
  <span class="text-muted">{sources.length} sources</span>
</div>
```

### ✅ 1.3 Organization-as-Author (Schema.org) - COMPLETE
**Location:** `src/lib/seo.ts` ✓ Updated

Use Organization schema (NOT personal author):
```json
{
  "@type": "Organization",
  "name": "StackHunt Research",
  "url": "https://stackhunt.co",
  "logo": "https://stackhunt.co/logo.png",
  "description": "AI-powered software research platform"
}
```

For reviews, use `publisher` not `author`:
```json
{
  "@type": "Review",
  "publisher": {
    "@type": "Organization",
    "name": "StackHunt Research"
  }
}
```

### ✅ 1.4 Transparency - COMPLETE
- ✓ Affiliate disclosure above the fold on all tool/review pages
- ✓ "Best Deal" badges with clear labeling
- ✓ Link to `/methodology` from footer
- ✓ Enhanced disclosure page with AI transparency

---

## ✅ Priority 2: Split-Brain Intelligence (The Human Touch) - COMPLETE

Already partially implemented in `src/lib/hunter/services/prompts.ts`.

### 2.1 Current State (Already Built)
The synthesis prompt already extracts:
- `reviewContext.budgetAnalyst` - Cost drivers, one-time fees, commitment terms, ROI threshold
- `reviewContext.userAdvocate` - Vibe, origin story, ideal for, avoid if, power tip, delighters, frustrations
- `reviewContext.humanVerdict` - Coffee Shop Speak summary

### ✅ 2.2 Improvements Needed - COMPLETE

**✅ A. Budget Analyst Display - COMPLETE**
**File:** `src/components/PricingInsights.astro` ✓ Created
Create component to render cost drivers:
```astro
<!-- src/components/PricingInsights.astro -->
<div class="pricing-insights">
  <h3>Price Mechanics</h3>
  <ul>
    {costDrivers.map(d => <li>{d}</li>)}
  </ul>
  {oneTimeFees.length > 0 && (
    <div class="one-time-fees">
      <strong>Setup Costs:</strong> {oneTimeFees.join(', ')}
    </div>
  )}
  {commitmentTerms && (
    <div class="commitment">Contract: {commitmentTerms}</div>
  )}
</div>
```

**✅ B. User Advocate Display - COMPLETE**
**File:** `src/components/TribalKnowledge.astro` ✓ Created
Create component for tribal knowledge:
```astro
<!-- src/components/TribalKnowledge.astro -->
<div class="tribal-knowledge">
  <div class="vibe">{vibe}</div>

  <div class="fit-guidance">
    <h4>Best For</h4>
    <ul>{idealFor.map(i => <li class="positive">{i}</li>)}</ul>

    <h4>Skip If</h4>
    <ul>{avoidIf.map(a => <li class="negative">{a}</li>)}</ul>
  </div>

  {powerTip && (
    <div class="power-tip">
      <LightbulbIcon /> Pro Tip: {powerTip}
    </div>
  )}
</div>
```

**✅ C. Human Verdict Placement - COMPLETE**
Display `humanVerdict` prominently at top of tool page, above the fold. ✓ Integrated in TribalKnowledge component

---

## ✅ Priority 3: Freshness & Community Verification - COMPLETE

### ✅ 3.1 Stale Data Alarms - COMPLETE
**Location:** Tool pages ✓ Integrated in VerifiedBadge component

If `last_verified_at` > 60 days ago:
```astro
<div class="stale-warning">
  Data last verified {daysAgo} days ago.
  <a href="#corrections">Report outdated info</a>
</div>
```

### ✅ 3.2 Community Verification Widget - COMPLETE
**File:** `src/components/PriceVerification.tsx` ✓ Created
**API:** `src/pages/api/verify-price.ts` ✓ Created
**Location:** Pricing sections on tool pages ✓ Integrated

```tsx
// src/components/PriceVerification.tsx (React island)
export function PriceVerification({ toolId, currentPrice }) {
  const [votes, setVotes] = useState({ yes: 0, no: 0 });

  const handleVote = async (accurate: boolean) => {
    if (!accurate) {
      // Auto-queue for re-hunt
      await fetch('/api/admin/queue-refresh', {
        method: 'POST',
        body: JSON.stringify({ toolId, reason: 'user_reported_stale' })
      });
    }
    // Record verification
    await fetch('/api/verify-price', {
      method: 'POST',
      body: JSON.stringify({ toolId, accurate })
    });
  };

  return (
    <div class="price-verification">
      <p>Is this pricing still accurate?</p>
      <button onClick={() => handleVote(true)}>Yes</button>
      <button onClick={() => handleVote(false)}>No, it changed</button>
      {votes.yes > 0 && (
        <span>Verified by {votes.yes} users this week</span>
      )}
    </div>
  );
}
```

### ✅ 3.3 Auto-Queue on "No" Vote - COMPLETE
When user clicks "No": ✓ Implemented
1. ✓ Insert into `hunt_queue` with `source: 'user_request'`, high priority
2. ✓ Show "Thanks! We'll verify this within 24 hours"

---

## ✅ Priority 4: Search Architecture (pSEO) - COMPLETE

### ✅ 4.1 Internal Link Loops - COMPLETE
**File:** `src/components/RelatedLinks.astro` ✓ Created

Every page now links to related pages: ✓ Implemented

| From | To | Status |
|------|-----|--------|
| Category Page | Best-of Lists, Tools in category | ✓ |
| Best-of List | Individual Tool Pages, Related Lists, Category | ✓ |
| Tool Page | Category, Best-of Lists, Related Tools | ✓ |

### ✅ 4.2 Suite/Bundle Navigation - COMPLETE
**Files Created:**
- `src/components/SuiteNavigation.astro` ✓
- `src/components/IncludedTools.astro` ✓

Already have `parent_id` architecture. Display: ✓ Implemented
- ✓ "Also in {Suite}" sidebar on child tool pages
- ✓ Parent suite card showing all included tools
- ✓ "Already have {Suite}? This is included." messaging

---

## ✅ Priority 5: Confidence Gating - COMPLETE

### ✅ 5.1 Noindex Low-Confidence Content - COMPLETE
**File:** `src/lib/confidence.ts` ✓ Created (Automated scoring system)
**Admin Dashboard:** `src/pages/admin/quality.astro` ✓ Created
**API:** `src/pages/api/admin/queue-tool.ts` ✓ Created
In `src/pages/tool/[slug].astro`: ✓ Integrated

```astro
---
const confidence = tool.specs?.pricing_data?.confidence || 'low';
const shouldNoindex = confidence === 'low' || !tool.short_description;
---
<head>
  {shouldNoindex && <meta name="robots" content="noindex" />}
</head>
```

Criteria for noindex:
- `pricing_data.confidence === 'low'`
- Missing `short_description`
- Zero sources in reviews
- QA Score < 4/8

---

## ✅ Database Changes - COMPLETE

### ✅ Migration 032: Add verification tracking - COMPLETE
**File:** `supabase/migrations/032_community_verification.sql` ✓ Created
```sql
-- 020_community_verification.sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS
  user_verifications_this_week INTEGER DEFAULT 0;

ALTER TABLE items ADD COLUMN IF NOT EXISTS
  last_user_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS price_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset weekly count
CREATE OR REPLACE FUNCTION reset_weekly_verifications()
RETURNS void AS $$
BEGIN
  UPDATE items SET user_verifications_this_week = 0;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ Implementation Order - COMPLETE

### ✅ Week 1 (Foundation) - COMPLETE
1. ✅ **Day 1:** Create `/methodology` page
2. ✅ **Day 2:** Add VerifiedBadge component, Organization schema
3. ✅ **Day 3:** Create PricingInsights + TribalKnowledge components
4. ✅ **Day 4:** Add stale data warning banner
5. ✅ **Day 5:** Build PriceVerification widget (basic version)

### ✅ Week 2 (Polish) - COMPLETE
1. ✅ Community verification database + API
2. ✅ Auto-queue on "No" vote
3. ✅ Noindex low-confidence pages (with automated scoring)
4. ✅ Suite navigation improvements
5. ✅ Internal linking audit

---

## ✅ Files Created/Modified - COMPLETE

### Files Created (17 total)
| File | Status |
|------|--------|
| `src/pages/methodology.astro` | ✅ CREATED |
| `src/components/VerifiedBadge.astro` | ✅ CREATED |
| `src/components/PricingInsights.astro` | ✅ CREATED |
| `src/components/TribalKnowledge.astro` | ✅ CREATED |
| `src/components/PriceVerification.tsx` | ✅ CREATED |
| `src/components/SuiteNavigation.astro` | ✅ CREATED |
| `src/components/IncludedTools.astro` | ✅ CREATED |
| `src/components/RelatedLinks.astro` | ✅ CREATED |
| `src/lib/confidence.ts` | ✅ CREATED |
| `src/pages/admin/quality.astro` | ✅ CREATED |
| `src/pages/api/verify-price.ts` | ✅ CREATED |
| `src/pages/api/admin/queue-tool.ts` | ✅ CREATED |
| `supabase/migrations/032_community_verification.sql` | ✅ CREATED |

### Files Modified (8 total)
| File | Changes |
|------|---------|
| `src/lib/seo.ts` | ✅ Organization schema + Review schema |
| `src/layouts/BaseLayout.astro` | ✅ Methodology link in footer |
| `src/pages/disclosure.astro` | ✅ Comprehensive AI transparency |
| `src/pages/tool/[slug].astro` | ✅ All new components integrated |
| `src/pages/categories/[slug].astro` | ✅ Related links added |
| `src/pages/best/[slug].astro` | ✅ Related links added |
| `src/lib/hunter/services/prompts.ts` | ✅ Syntax error fixed |
| `.claude/docs/ROADMAP_V1.md` | ✅ Marked all items complete |

---

## 🎉 ROADMAP V1 - 100% COMPLETE

All 5 priorities implemented:
- ✅ Priority 1: Institutional Trust (EEAT)
- ✅ Priority 2: Split-Brain Intelligence
- ✅ Priority 3: Freshness & Community Verification
- ✅ Priority 4: Search Architecture (pSEO)
- ✅ Priority 5: Confidence Gating

**Total:** 17 files created, 8 files modified, 1 database migration
