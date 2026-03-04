# Codex Build Brief: Tool Pages v1

Last verified: 2026-03-05

Status: Draft
Scope: implementation contract for `/tool/[slug]`

## 1) Build Goal

Enforce a decision-first tool page that is:
- people-first and specific
- legally defensible
- schema-safe
- index-safe

## 2) Required Content Contract

Each tool page assembly must produce:
- `page_type = tool_review`
- `primary_intent`
- `evaluation_depth`
- `fact_fields[]`
- `fact_sources[]`
- `confidence`
- `last_checked_at`
- `last_editorial_update_at`
- `allowed_sections[]`

If any critical field is missing, page remains draft/noindex.

## 3) Section Render Rules

Render order:
1. decision header
2. why choose / why skip
3. pricing
4. alternatives
5. evidence/methodology
6. update history

Render policy:
- render only sections listed in `allowed_sections`
- suppress any optional section if confidence is low or required fields missing
- suppress any claim that lacks required sourcing for its volatility/risk class
- if unknown, render `Not confirmed` (never infer)

## 4) Copy Generation Rules

Hard rules:
- no generic verdict tokens in intro/verdict
- no experiential wording unless `evaluation_depth` includes hands-on
- include at least one concrete tradeoff/constraint in verdict
- include at least one “best for” and one “not for” with specific triggers

Reject output if:
- intro/verdict is template-generic
- it contains banned phrase list
- claim text is incomplete or malformed

## 5) Pricing Rules

- only render numeric pricing when official pricing evidence + date exists
- if pricing evidence incomplete: render constrained fallback block (unknowns + source links)
- reject contradictory labels/tiers/prices
- do not infer annual math not explicitly sourced

## 6) Schema Rules

- emit JSON-LD only for content represented visibly on page
- default: `BreadcrumbList` + `SoftwareApplication` (if supported by visible facts)
- avoid FAQ-heavy strategy in v1 unless FAQ data passes confidence/freshness checks
- schema validation is part of publish gate
- fail publish on critical schema/content mismatch

## 7) Indexing and Publish Rules

- tool page defaults to noindex unless publish gate passes
- publish gate must include:
  - intent coherence (title/H1/intro)
  - evidence and freshness thresholds
  - section completeness
  - contradiction checks
  - schema parity checks

## 8) Legal and Source Rules

- negative community claims must be hedged + attributed
- official-source claims must not be phrased as community hearsay
- do not copy source prose verbatim into final user-facing copy
- do not present hidden or inferred data as confirmed facts

## 9) Component Rules (Tool Page)

Top-of-page components allowed:
- H1 + decision summary
- best-for/not-for
- pricing model + checked date + confidence
- primary CTA + limited jump links

Top-of-page components disallowed:
- internal index/score explanations
- published analysis counters
- source-count counters
- correction modal triggers

## 10) Lint + QA Automation (Minimum)

Implement (or extend) checks for:
- generic verdict phrase detection
- intent mismatch (title vs H1)
- stale volatile claims
- contradictory pricing values
- orphaned optional sections
- schema-visible mismatch

## 11) Fallback Behavior Matrix

When data is weak:
- unknown claim => `Not confirmed`
- conflicting claim => show conflict note or suppress section
- missing pricing source => render non-numeric fallback pricing state
- missing evidence for critical verdict claim => demote verdict confidence or block publish

When quality is insufficient:
- remain draft
- enforce noindex
- include explicit verification status messaging

## 12) Extension to Best/Compare

Future page types must reuse:
- source type taxonomy
- freshness windows
- contradiction handling
- schema parity checks

But each page type must define its own dominant decision job and required sections.
