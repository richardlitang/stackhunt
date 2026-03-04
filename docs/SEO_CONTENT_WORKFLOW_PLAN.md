# SEO + Helpfulness Content Workflow Plan

Last verified: 2026-03-05

Date: 2026-03-02
Owner: Content + SEO + Engineering

## Objective

Ship content that ranks and is genuinely useful for people making software decisions.

## Core Standards

1. Helpfulness before volume.
2. Evidence before claims.
3. Publish only what passes quality gates.
4. Keep pages fresh or remove from index.

## Workflow

### 1) Intake and Prioritization (Daily)

- Accept ideas only with clear intent and business relevance.
- Require at least 3 candidate sources before queueing.
- Prioritize by: demand x business value x confidence in evidence.

### 2) Brief Creation (Required before draft)

Each brief must include:
- Target query cluster and intent.
- Page type: `tool`, `best`, `compare`, or `article`.
- Required sections and schema expectations.
- Source plan (official docs + independent references).
- Internal linking plan (inbound and outbound).

### 3) Draft Production

Page-type requirements:

| Page type | Required sections |
|---|---|
| Tool (`/tool/*`) | How We Evaluated, Why This Verdict, Best for, Not for/Watch outs, FAQ, Alternatives |
| Best (`/best/*`) | Ranking criteria, comparison table, per-item tradeoffs, fit guidance |
| Compare (`/compare/*`) | Choose A when, Choose B when, pricing delta, switching cost, constraints |
| Article (`/articles/*`) | Direct answer, implementation detail, linked next step to commercial pages |

### 4) Evidence + Claim Validation (Hard Gate)

- Every critical claim must have a source.
- Pricing, limits, security, and compatibility claims require explicit source links.
- Remove generic filler and unsupported superlatives.

### 5) SEO + Helpfulness QA (Hard Gate)

Run before publish:

```bash
npm run qa:gates
npm run qa:rendered-tool-pages -- --sample=15
npm run qa:seo:sitemaps
```

Fail publish when:
- Required sections are missing for page type.
- Schema fields are not represented in visible content.
- Intended publish pages are noindex.
- Sitemap endpoints are broken or missing.
- Claim evidence is incomplete for critical assertions.

### 6) Publish + Index Control

- Publish only pages that pass all gates.
- Keep draft/noindex pages out of indexable sitemap paths.
- Validate canonical + robots + sitemap alignment on release.

### 7) Post-Publish Monitoring (Weekly)

Track per page:
- Index status.
- Impressions, clicks, average position.
- Internal link coverage.
- Freshness age.
- Helpfulness feedback (thumbs / correction signals where available).

### 8) Refresh Loop (Biweekly)

- Re-queue pages with ranking decay, stale facts, or weak helpfulness signals.
- Refresh highest-impact pages first.
- Re-run full QA gate before re-publish.

## Helpfulness Gate (Must Pass)

For each publishable page:

1. Decision clarity appears in first screen.
2. Fit and misfit are explicit (`Best for` and `Not for`).
3. Tradeoffs are concrete (cost, limits, complexity, risk).
4. Next step is actionable (what to do now).
5. Content is scannable (summary blocks, table, FAQ).
6. Critical claims are source-backed.

## KPI Targets

- Indexable publish rate: >= 80% of intended publish pages.
- Critical claim source coverage: 100%.
- Tool page FAQ depth: 3-6 meaningful FAQs.
- Internal link completeness: 100% for money pages.
- Freshness SLA (tier-1 pages): <= 45 days since verification.
- SEO gate pass rate: trend up month-over-month.

## 30-60-90 Rollout

### 30 Days

- Enforce brief template and hard gates.
- Add helpfulness checklist to editorial review.
- Start weekly KPI reporting.

### 60 Days

- Expand compare inventory and indexable tool coverage.
- Reduce noindex backlog for pages that meet standards.
- Establish recurring refresh queue.

### 90 Days

- Run fully operational refresh system.
- Track GEO outcomes and citation readiness.
- Tune templates based on failures and user feedback.

