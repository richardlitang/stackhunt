# Legal Compliance Guide for Content Attribution

## Overview

StackHunt aggregates software reviews from public sources and synthesizes them into original content with proper attribution. This document outlines our compliance with copyright law, fair use doctrine, and platform Terms of Service.

---

## ✅ Current Compliance Status

### What We Do Right

1. **Synthesis, Not Copying** (Line 46-59 of prompts.ts)
   - AI instructed to "write as neutral statement"
   - Extract facts, synthesize opinions
   - NO verbatim quoting from reviews

2. **Full Source Attribution** (Line 7-21 of prompts.ts)
   - Every pro/con includes `source_url`, `source_type`, `claim_type`
   - Sources displayed inline with proper attribution
   - Links to original content (drives traffic back)

3. **Proper Hedging Language** (Line 38-96 of ProsCons.astro)
   - Community sources: "Users report that..."
   - Editorial sources: "According to reviews..."
   - Official sources: No hedging (authoritative)

4. **Respectful Scraping**
   - Use Jina.ai Reader (respects robots.txt)
   - Limited to 3-5 pricing pages per tool (not mass scraping)
   - 10-second timeouts to prevent abuse
   - 50KB truncation limit

5. **Proper rel Attributes** (Line 125-140 of ProsCons.astro)
   - `rel="nofollow"` for review aggregators (don't steal SEO juice)
   - `rel="ugc"` for user-generated content (Google guideline)
   - `rel="dofollow"` only for official sources

6. **Transformative Use**
   - Analyze 10-50 sources → Synthesize 5 pros + 5 cons
   - Add context-specific scoring (0-100)
   - Generate original verdicts and fit scores

---

## Copyright & Fair Use Analysis

### Legal Doctrine: 17 U.S.C. § 107

| Factor | Our Implementation | Status |
|--------|-------------------|--------|
| **Purpose** | Commentary, comparison, research (transformative) | ✅ Pass |
| **Nature** | Factual information (less protected than creative works) | ✅ Pass |
| **Amount** | Brief summaries, not full text | ✅ Pass |
| **Market Effect** | Drives traffic TO sources via links | ✅ Pass |

**Conclusion:** Our use qualifies as transformative fair use.

---

## The "Dos" We Follow

✅ **DO Summarize the Sentiment**
- AI instruction: "write as neutral statement"
- We read 10+ reviews → synthesize into 1 factual claim
- Example: 50 people say "battery life is bad" → We write "Poor battery life" (fact about product)

✅ **DO Use Tribal Knowledge Attribution**
- Format: "One user on Reddit noted that..." (with link)
- Treated as journalistic citation

✅ **DO Link to the Source**
- Every pro/con has clickable source link
- Footer shows source domains
- Drives traffic back to original platforms

✅ **DO Focus on Common Themes**
- Extract factual consensus from multiple sources
- "Pricing changed to $15/month" = fact, not copying expression

---

## The "Don'ts" We Avoid

❌ **DON'T Scrape En Masse**
- ✅ We use Serper API for search (not scraping Google)
- ✅ We scrape only 3-5 pricing pages per tool
- ✅ We use Jina.ai (respects robots.txt)
- ✅ Rate-limited by API quotas

❌ **DON'T Copy-Paste Verbatim**
- ✅ AI prompt explicitly says "write as neutral statement"
- ✅ No instruction to quote verbatim
- ✅ We synthesize facts from multiple sources

❌ **DON'T Attribute to Ourselves**
- ✅ Clear distinction: "Based on user feedback..." vs "We tested..."
- ✅ Source badges show: Official, Review, Community
- ✅ Footer disclaimer: "AI-powered research platform"

❌ **DON'T Ignore robots.txt**
- ✅ Jina.ai Reader respects robots.txt automatically
- ✅ Serper API (Google Search) respects robots.txt
- ✅ We don't directly scrape restricted sites

---

## Hunter Workflow Compliance

### Phase 1: Research (research.ts)

**What We Do:**
1. Search via Serper API (12 queries):
   - Reviews
   - Pricing
   - Alternatives
   - Reddit discussions
   - Company info
   - Technical/API docs

2. Scrape 3-5 pricing pages:
   - Use Jina.ai Reader (respects robots.txt)
   - Extract pricing facts only
   - Truncate at 50KB

**Compliance:**
- ✅ No mass scraping
- ✅ Respects robots.txt via Jina.ai
- ✅ Limited to public search results

### Phase 2: Analysis (analysis.ts)

**What We Do:**
1. AI reads search snippets
2. Synthesizes original pros/cons
3. Requires source_url for every claim
4. Classifies source_type and claim_type

**Prompt Instructions (lines 200-206):**
```
IMPORTANT:
- Base your analysis primarily on the VERIFIED FACTS above
- EVERY claim MUST have a source_url from the search results above
- Do NOT contradict the verified facts
- Do NOT fabricate URLs - only use URLs that appear in the search results
```

**Compliance:**
- ✅ Synthesizes, doesn't copy
- ✅ Full attribution
- ✅ Fact-checking against sources

### Phase 3: Persistence (persistence.ts)

**What We Store:**
- Synthesized pros/cons (NOT original review text)
- Source URLs (for attribution)
- Source types (for hedging)
- Tool metadata (facts from official sources)

**What We DON'T Store:**
- Full review text from G2/Capterra/Reddit
- Copyrighted creative expressions
- Paywalled content

**Compliance:**
- ✅ Stores facts and citations, not copyrighted content
- ✅ Links back to original sources

---

## Frontend Display Compliance

### ProsCons.astro Component

**Attribution Display:**
```astro
<span class="inline-flex items-center gap-1 ml-2">
  <span class="badge">{source_type}</span> <!-- Official/Review/Community -->
  <a href={source_url} rel={rel_attribute}>
    <ExternalLinkIcon />
  </a>
</span>
```

**Hedging for Community Sources:**
```astro
"Users report that [claim]"
"According to community feedback, [claim]"
"Based on user discussions, [claim]"
```

**Compliance:**
- ✅ Inline attribution (E-E-A-T best practice)
- ✅ Hedging for subjective claims
- ✅ Proper rel attributes

---

## Platform Terms of Service

### G2, Capterra, TrustRadius

**Their ToS typically prohibits:**
- Mass scraping of reviews
- Copying full review text
- Removing attribution

**What We Do:**
- ✅ Use Google Search results (public snippets)
- ✅ Synthesize facts, not copy text
- ✅ Link back to original reviews

**Compliance:** We access via Google Search (public domain), not direct scraping. We cite sources properly.

### Reddit, HackerNews

**Their ToS typically prohibits:**
- Automated mass scraping
- Commercial use without attribution

**What We Do:**
- ✅ Use Google Search results (public snippets)
- ✅ Attribute as "One user on Reddit mentioned..."
- ✅ Link directly to thread
- ✅ rel="nofollow ugc" (Google UGC guideline)

**Compliance:** We access via Google Search, cite as community opinion with hedging.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Copyright infringement (copying verbatim) | **Low** | AI synthesizes, doesn't quote |
| ToS violation (mass scraping) | **Very Low** | Use APIs, respect robots.txt, limited scraping |
| Misattribution | **Very Low** | Every claim has source_url |
| Platform C&D letters | **Low** | We drive traffic, cite properly |

---

## Legal Disclaimer (Footer)

**Current Disclaimer (BaseLayout.astro:173-178):**
```
StackHunt is an independent research platform. Pricing, features, and
verdicts are synthesized by AI from public data. While we refresh data
every 30-60 days, software terms change rapidly. Always verify final
costs on the vendor's official website.
```

**Recommended Addition:**
```
We reference and cite third-party reviews under fair use for purposes
of comparison and commentary. All opinions are attributed to their
original sources with proper links.
```

---

## Compliance Checklist

Before each hunt:
- [ ] AI prompt includes "write as neutral statement"
- [ ] Every claim requires source_url
- [ ] Source_type classification enforced
- [ ] Hedging applied for community sources
- [ ] Links use proper rel attributes

After analysis:
- [ ] No verbatim quotes stored
- [ ] All claims have attribution
- [ ] Sources linked in UI
- [ ] Disclaimer displayed

Quarterly review:
- [ ] Audit random sample of 10 tools
- [ ] Verify no verbatim copying
- [ ] Check attribution links work
- [ ] Review legal doctrine changes

---

## Recommended Prompt Enhancement

**Add to synthesis prompt (line 206 of prompts.ts):**

```typescript
## CRITICAL: Do NOT Quote Verbatim

- NEVER copy exact phrasing from reviews
- SYNTHESIZE facts from multiple sources
- Example BAD: "Using this software feels like wading through molasses in January"
- Example GOOD: "Users report slow performance and poor responsiveness"

Focus on FACTS about the product, not creative expressions.
```

---

## Summary

**Legal Status:** ✅ Compliant

**Key Protections:**
1. Transformative fair use (synthesis + analysis)
2. Full source attribution
3. Drives traffic to original sources
4. Respects robots.txt via Jina.ai
5. No mass scraping (limited to 3-5 pages per tool)
6. Clear disclaimers

**Next Steps:**
1. Add explicit "no verbatim" instruction to prompt
2. Update footer disclaimer with fair use statement
3. Quarterly compliance audits

**When to Consult Lawyer:**
- If you receive C&D letter
- Before adding paywalled content sources
- If expanding to EU (GDPR considerations)
- Before raising VC funding (legal diligence)
