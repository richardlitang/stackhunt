# Full SEO Audit Report - StackHunt

Last verified: 2026-03-05

Date: 2026-03-04
Site: https://stackhunt.io
Audit mode: `seo-audit` skill (inline)
Companion priority addendum: `docs/SEO_CONTENT_PRIORITY_COMPETITOR_2026-03-04.md`

## Executive Summary

- Overall SEO Health Score: **67 / 100**
- Business type detected: **Programmatic SaaS review/publisher**
- Crawl scope signals:
  - `sitemap-static.xml`: 7 URLs
  - `sitemap-categories.xml`: 66 URLs
  - `sitemap-gear.xml`: 1 URL
  - `sitemap-tools.xml`: 6 URLs
  - `sitemap-best.xml`: 40 URLs
  - `sitemap-compare.xml`: 0 URLs
- Key page sample observed live: `/`, `/tools`, `/best`, `/tool/chatgpt`
- Performance source: latest local Lighthouse CI run (`2026-02-18`, desktop, 3 runs each for `/` and `/tools`)

## Top 5 Critical Issues

1. **`/sitemap-articles.xml` returns 404 on production**
   - Observed live: HTTP 404 + 404 HTML page.
   - Impact: article URLs are undiscoverable via dedicated sitemap endpoint.

2. **Sitemap index omits article sitemap**
   - Production `/sitemap.xml` currently includes: static/tools/best/categories/compare/gear only.
   - Code indicates article sitemap should exist in index (`src/pages/sitemap.xml.ts`).
   - Impact: likely deployment drift or route regression.

3. **AI search discoverability is intentionally blocked for major AI crawlers**
   - `robots.txt` blocks `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, `meta-externalagent`, etc.
   - Impact: near-zero eligibility for AI citation indexing (AIO/ChatGPT/Perplexity ingestion).

4. **`/llms.txt` is missing (returns 404 page)**
   - Impact: no explicit AI-consumption guidance doc, weaker GEO posture.

5. **Very low indexable tool footprint in tools sitemap (6 URLs)**
   - `/tools` page presents many tools, but only 6 emitted in `/sitemap-tools.xml`.
   - Could be intentional due quality gates, but likely suppressing index growth materially.

## Top 5 Quick Wins

1. Restore and serve `/sitemap-articles.xml` in production; include it in sitemap index.
2. Add `llms.txt` with policy + key crawlable sections.
3. Decide policy: keep AI bot blocking or allow selected bots for GEO goals.
4. Review `items.specs.canonical.quality.should_index` gating to increase publish-ready tool URLs.
5. Add comparison snapshot pipeline checks so `/sitemap-compare.xml` is not empty when compare pages exist.

## Category Scores

Scoring weights:
- Technical 25%
- Content 25%
- On-page 20%
- Schema 10%
- Performance 10%
- Images 5%
- AI readiness 5%

### 1) Technical SEO - 58/100 (weighted 14.5)

What is good:
- Strong security headers present (`HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, CSP).
- `robots.txt` exists and declares sitemap.
- Dynamic sitemap architecture exists in code and production endpoints.

Issues:
- `/sitemap-articles.xml` 404 in production.
- Production sitemap index missing articles sitemap.
- `/sitemap-compare.xml` currently empty.
- Intermittent DNS failures during audit from this environment prevented full 500-page crawl confirmation.

### 2) Content Quality (E-E-A-T) - 70/100 (weighted 17.5)

What is good:
- Tool pages include evidence-oriented sections (`How We Evaluated`, `Verdict`, FAQ).
- Disclosure and methodology pages are linked sitewide.
- Tool copy appears specific (not fully generic placeholder text in sampled pages).

Issues:
- High number of pages appear editorially gated/noindex (sample: `/tool/chatgpt` showed noindex state).
- Unable to run full rendered-page QA due transient DNS/Supabase resolution failures in runtime build.

### 3) On-Page SEO - 76/100 (weighted 15.2)

What is good:
- Sampled pages have title, meta description, robots tag, canonical, and H1.
- Meta patterns are consistent via shared `BaseLayout` and SEO helpers.

Issues:
- Noindex tool page sampled had canonical pointing to `/tools` (index page), which may be intentional for drafts but should be validated against canonical strategy.
- Compare inventory appears underpowered from sitemap standpoint.

### 4) Schema / Structured Data - 82/100 (weighted 8.2)

What is good:
- Sitewide Organization + WebSite schema present.
- Tool pages emit `SoftwareApplication`, `BreadcrumbList`, and conditional `FAQPage`.
- Schema generation centralized in `src/lib/seo.ts`.

Issues:
- Need continuous parity checks between visible content and structured fields for all templates (partially enforced in codebase, but runtime verification failed during this session).

### 5) Performance / Core Web Vitals - 68/100 (weighted 6.8)

Source: `.lighthouseci` latest run (desktop)
- `/` performance scores: **0.68 / 0.77 / 0.61**
- `/tools` performance scores: **0.74 / 0.61 / 0.67**
- Accessibility: 0.90-0.94
- Best Practices: 0.93
- SEO: 0.92
- LCP ranges observed: ~2.3s to ~4.5s
- CLS excellent (near zero)

Issue:
- Performance is the only failing asserted threshold in recent LHCI (`/tools` below 0.75 warning).

### 6) Images - 80/100 (weighted 4.0)

What is good:
- Sampled cards/logos include `alt` attributes.
- Fallback image logic exists for brand/logo loading.

Issues:
- No broad image payload audit run in this session due crawl instability.

### 7) AI Search Readiness (GEO) - 20/100 (weighted 1.0)

Current state:
- AI crawlers blocked in robots.
- No `llms.txt` on production.

Impact:
- Strongly limits AI citation visibility despite structured page architecture.

## Technical Findings (File/Endpoint Evidence)

Production endpoints:
- `https://stackhunt.io/robots.txt` present; blocks major AI bots.
- `https://stackhunt.io/sitemap.xml` present; does **not** include `/sitemap-articles.xml`.
- `https://stackhunt.io/sitemap-articles.xml` returns 404.
- `https://stackhunt.io/llms.txt` returns 404 page.

Repository signals:
- Sitemap index code includes articles entry: `src/pages/sitemap.xml.ts`
- Articles sitemap route exists: `src/pages/sitemap-articles.xml.ts`
- Robots source blocks AI crawlers: `public/robots.txt`
- Schema/meta builders: `src/lib/seo.ts`, `src/layouts/BaseLayout.astro`

## Limitations

- Full 500-page crawl requested by skill could not be completed deterministically due intermittent DNS resolution failures in this environment (also impacted Supabase host resolution during local build/audit script execution).
- This report combines live endpoint evidence with code-level verification and recent stored Lighthouse results.
