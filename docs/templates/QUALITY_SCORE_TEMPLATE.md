# Quality Score Template

Last verified: 2026-03-05

Use this template for `docs/QUALITY_SCORE.md` updates.

## Scoring Scale

- 5: Strong, no known blockers
- 4: Good, minor issues only
- 3: Mixed, notable weaknesses
- 2: Risky, frequent regressions or drift
- 1: Critical, immediate remediation needed

## Domain Scorecard

| Domain | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| Example domain | 3 | Link to tests, logs, or docs | Missing guardrail | Team/owner |

## Architecture Layer Scorecard

| Layer | Score (1-5) | Evidence | Gaps | Owner |
|---|---|---|---|---|
| UI | 3 | Link to checks | Component drift | Team/owner |

## Top Risks

- Risk 1 with impact and trigger condition.

## Weekly KPI

- Docs with Last verified markers: baseline pending first full cleanup run
- Open doc-gardening tasks: track from `docs/plans/active/doc-gardening.md`
- Policy drift findings this week: track from `docs/generated/doc-gardener-report.md`

## Next Review

- Target date:
- Review owner:
- Planned remediation PRs:
