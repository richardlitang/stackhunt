# Tool Page Standard v1

Last verified: 2026-03-05

Status: Draft
Owner: StackHunt Editorial + Product
Scope: `/tool/[slug]` pages only (v1). Built to extend to `/best` and `/compare`.

Layout and section-order implementation details live in [Tool Page Blueprint v1](./TOOL_PAGE_BLUEPRINT_V1.md).

## 1) Purpose

A tool page exists to help one buyer decide whether to shortlist or skip one specific tool.

Primary intents allowed:
- `[tool] review`
- `[tool] pricing`
- `is [tool] worth it`
- `[tool] alternatives`

Rule: one URL = one dominant decision job.

## 2) Success Criteria

A successful tool page:
- answers the decision question in the first viewport
- presents product-specific tradeoffs (not template-safe language)
- shows source-backed claims with freshness dates
- clearly distinguishes tested vs not tested
- keeps schema aligned to visible content

## 3) Required Above-the-Fold Block

Must show, in this order:
1. Intent-aligned H1 (not just tool name)
2. One-paragraph decision summary (specific)
3. Best for
4. Not for
5. Starting price or pricing model + confidence
6. Last checked date
7. Evaluation depth (docs-only, light hands-on, deep hands-on)
8. Primary CTA

Must not show above the fold:
- internal scoring explanations
- published-analysis counters
- source-count bragging
- correction/report widgets
- long methodology blocks

## 4) Required Core Sections

Required sections for tool pages:
- Intro verdict
- Why choose it (3-5 concrete reasons)
- Why skip it (2-4 concrete reasons)
- Best fit / weak fit
- Pricing (with explicit unknown handling)
- Alternatives (3-6 with differentiators)
- Evidence & sourcing
- Update history

Optional sections (render only with high-confidence data):
- Security/compliance
- Integrations
- Setup path
- Portability/export
- FAQ
- Included tools / suite navigation
- Community signals

Optional section rule:
- If required fields for a section are missing or low confidence, suppress section.
- Do not render placeholder or procedural filler in production-indexable mode.

## 5) Copy Standard

Must:
- use direct plain language
- include concrete constraints and thresholds
- explain tradeoffs
- state uncertainty explicitly when present
- use tool-specific nouns and numbers

Must not:
- use generic verdict phrases (example: "worth shortlisting")
- claim hands-on experience on docs-only pages
- publish reusable boilerplate intros across tools
- add sections because the template has them

## 6) Evidence and Freshness Model

Every user-visible claim should carry:
- source URL
- source type
- confidence
- last checked date

Source type enum (v1):
- `official_doc`
- `official_pricing`
- `hands_on_test`
- `independent_high_trust`
- `community_signal`
- `editorial_inference`

Freshness windows (v1):
- pricing and plan limits: 7-14 days
- model/version/quotas/rate limits: 7-14 days
- security/compliance claims: 30 days
- company/funding/headcount: 30-90 days
- editorial summaries: recompute when dependent facts change

Rendering rules:
- low confidence => soften language
- unknown => show `Not confirmed`
- conflicting sources => show conflict, do not fake precision

## 7) SEO and IA Standard

Title format:
- `[Tool] Review (YYYY): Pricing, Best For, Tradeoffs & Alternatives | StackHunt`

H1 rule:
- must match title intent and include “Review” framing

Meta description:
- who this is for
- biggest tradeoff
- strongest differentiator
- decision outcome this page helps with

URL:
- `/tool/[slug]`

Internal links:
- use crawlable `<a href>` with descriptive anchor text

## 8) Structured Data Standard

Default schema for tool pages:
- `BreadcrumbList`
- `SoftwareApplication` only when visible content supports fields

Do not prioritize for tool pages in v1:
- FAQ rich-result optimization as a core strategy
- rating/review schema unless strict eligibility and visible parity checks pass

Schema parity rule:
- every emitted field must be visible and materially represented in on-page content

## 9) Legal-Safe Content Operation

Green zone:
- normalized facts from official sources
- original synthesis and decision guidance
- transparent sourcing and dates

Yellow zone (policy controlled):
- short quotes
- logos/screenshots with explicit allowed-use policy
- community claims with attribution + hedging

Red zone:
- copied vendor prose at scale
- unsourced negative claims
- fake experiential language
- hidden or misleading schema fields

## 10) Tool Page Fail Conditions

A tool page fails standard if any are true:
- title and H1 target different intents
- intro could fit many unrelated tools
- verdict language is generic or unsupported
- pricing section contains contradictions or fake precision
- optional sections render with missing required data
- schema includes non-visible/non-representative fields
- stale volatile facts exceed freshness window

## 11) Extension Hooks for Best/Compare (Future)

When extending this standard:
- reuse source type enum and freshness windows
- keep one dominant decision job per page type
- apply same schema parity and optional-section suppression rules
