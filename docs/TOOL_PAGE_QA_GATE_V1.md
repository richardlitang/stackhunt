# Tool Page QA Gate v1

Last verified: 2026-03-27

Status: Draft
Scope: publish gate for `/tool/[slug]`
Mode: pass/fail only

## 0) Gate Outcome

A page is publishable only when all critical checks pass.

- `PASS`: eligible for index + publish
- `FAIL`: remain draft/noindex

## 1) Intent and Structure (Critical)

- [ ] Title includes explicit review intent for tool page
- [ ] H1 matches title intent (not just product name)
- [ ] Intro states decision outcome in concrete language
- [ ] Above-the-fold includes best-for and not-for
- [ ] Above-the-fold includes pricing model/starting price + last checked + confidence

Fail on any unchecked item.

## 2) Editorial Quality (Critical)

- [ ] Intro is tool-specific (cannot apply to 3+ unrelated tools)
- [ ] `Why choose` has at least 3 concrete reasons
- [ ] `Why skip` has at least 2 concrete reasons
- [ ] Verdict includes at least one explicit constraint or tradeoff
- [ ] No banned generic verdict phrases (examples: "worth shortlisting", "solid choice", "great tool")

Fail on any unchecked item.

## 3) Evidence and Freshness (Critical)

- [ ] Every critical claim has source URL and source type
- [ ] Volatile facts (pricing/models/limits) within freshness window
- [ ] Docs-only pages do not claim first-hand experience
- [ ] Community-sourced negative claims are hedged and attributed
- [ ] Contradictory facts are surfaced or section-suppressed

Fail on any unchecked item.

## 4) Pricing Section (Critical)

- [ ] Pricing section shown only when minimum data quality is met
- [ ] Unknown values shown as `Not confirmed`
- [ ] No contradictory plan names/prices across page regions
- [ ] No fake precision and no placeholder economics
- [ ] Official pricing source link + checked date visible

Fail on any unchecked item.

## 5) Section Suppression (Critical)

- [ ] Optional sections with missing required fields are hidden
- [ ] No procedural filler sections in indexable state
- [ ] No orphaned sections that add no decision value
- [ ] Decision and pricing cards avoid verbose pending fillers (for example, no `Not confirmed yet`)

Fail on any unchecked item.

## 6) Crawlability and On-Page UX (Critical)

- [ ] Main decision content is server-rendered
- [ ] Internal navigation/discovery uses crawlable `<a href>` links
- [ ] Section-rail links only target rendered section IDs on the page
- [ ] Core answer is visible without expanding multiple widgets
- [ ] Main value is not buried under trust/template chrome

Fail on any unchecked item.

## 7) Structured Data (Critical)

- [ ] Emitted schema fields match visible content
- [ ] No markup for hidden/misleading/unsupported fields
- [ ] Schema validation has no critical errors

Fail on any unchecked item.

## 8) Hygiene and Completeness (Critical)

- [ ] No placeholder text or incomplete clauses
- [ ] Dates are internally consistent (`last checked` <= `today`)
- [ ] No broken source links in primary evidence block
- [ ] No repeated pending-status filler copy across decision cards (use compact placeholders)

Fail on any unchecked item.

## 9) Recommended Warnings (Non-blocking in v1)

- [ ] Excessive template chrome in first viewport
- [ ] Source diversity is low
- [ ] Community evidence dominates official evidence
- [ ] Update history lacks meaningful change notes

## 10) Automation Hooks (for codex/lint)

Recommended automated checks:

- generic phrase lint in verdict/intro blocks
- title/H1 intent coherence lint
- pricing contradiction detector across rendered sections
- freshness-window validator by claim volatility class
- schema-visible-content parity checker
