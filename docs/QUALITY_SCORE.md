# StackHunt Quality Score

Last verified: 2026-03-05

## Scoring Scale

- 5: Strong, no known blockers
- 4: Good, minor issues only
- 3: Mixed, notable weaknesses
- 2: Risky, frequent regressions or drift
- 1: Critical, immediate remediation needed

## Domain Scorecard

| Domain | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| Research and analysis pipeline | 3 | quality gates workflow, content policy gates, rendered template checks | Large persistence phase file increases drift risk | StackHunt team |
| Publishing and trust gates | 4 | draft-first/human approval constraints, qa gate scripts | Some policy checks still script-only and not linted | StackHunt team |
| SEO operations | 3 | scheduled SEO health workflow, sitemap validation | Quality metrics not uniformly tied to docs freshness | StackHunt team |

## Architecture Layer Scorecard

| Layer | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| Route/page layer | 3 | route-thin guidance in AGENTS, rendered page gates | large page files still present | StackHunt team |
| Domain logic (`src/lib`) | 3 | quality gates, typecheck, unit tests | persistence hotspot complexity | StackHunt team |
| Data/security layer | 4 | RLS/service-role separation guidance, build + QA gates | advisor runs not yet part of every schema change flow | StackHunt team |

## Top Risks

- Hotspot files can absorb new policy logic and erode layer boundaries.
- Documentation freshness across historical docs remains uneven and needs ongoing gardening.
- Rapid SEO content changes can outpace validation if manual review steps are skipped.

## Weekly KPI

- Docs with Last verified markers: baseline pending first full cleanup run
- Open doc-gardening tasks: track from `docs/plans/active/doc-gardening.md`
- Policy drift findings this week: track from `docs/generated/doc-gardener-report.md`

## Next Review

- Target date: 2026-03-12
- Review owner: StackHunt maintainers
- Planned remediation PRs: persistence extraction slices, doc freshness cleanup, stricter publish-policy linting
