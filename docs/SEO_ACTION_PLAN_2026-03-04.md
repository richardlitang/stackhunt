# SEO Action Plan - StackHunt

Date: 2026-03-04

## Critical (Fix immediately)

1. Restore article sitemap route in production
- Target: `/sitemap-articles.xml` must return XML 200
- Validation:
  - `curl -I https://stackhunt.io/sitemap-articles.xml` -> 200 + `content-type: application/xml`
  - URL count > 0 when articles exist

2. Include article sitemap in sitemap index
- Target: `/sitemap.xml` includes `<loc>https://stackhunt.io/sitemap-articles.xml</loc>`
- Validation:
  - `curl -sL https://stackhunt.io/sitemap.xml` contains articles entry

3. Decide AI crawler policy explicitly
- If GEO is desired: allow at least selected AI fetchers (`GPTBot`, `ClaudeBot`, `PerplexityBot` where applicable).
- If blocking is intentional: document this as strategy and de-prioritize GEO KPI targets.

## High (Within 7 days)

1. Add `llms.txt`
- Include scope, citation preferences, allowed sections, freshness signals, contact.
- Validation:
  - `https://stackhunt.io/llms.txt` returns 200 plain text

2. Reconcile indexable tool volume
- Audit `should_index` gating for tools so sitemap reflects intended publish footprint.
- Validation:
  - Track count trend in `/sitemap-tools.xml` and GSC indexed URLs

3. Unblock compare sitemap growth
- If compare pages are strategic, ensure snapshot pipeline publishes canonical compare routes.
- Validation:
  - `/sitemap-compare.xml` contains expected URL set

## Medium (Within 30 days)

1. Improve performance budget on `/tools`
- Prioritize LCP stabilization and JS/main-thread work on listing pages.
- Target: Lighthouse performance >= 0.80 median for `/` and `/tools`.

2. Add continuous sitemap health checks in CI/cron
- Verify all declared child sitemaps return 200 XML.
- Fail deploy/alert when sitemap index and route set diverge.

3. Add GEO observability
- Track AI referrer/citation signals, crawl logs, and citations by template.

## Validation Checklist

- [ ] `/sitemap.xml` includes articles
- [ ] `/sitemap-articles.xml` 200 XML
- [ ] `/llms.txt` 200 text
- [ ] AI crawler policy explicitly aligned to GEO goals
- [ ] `/sitemap-tools.xml` count aligns with intended indexable inventory
- [ ] `/sitemap-compare.xml` no longer unintentionally empty
- [ ] Lighthouse performance warning resolved for `/tools`
