# Tool Page Blueprint v1

Last verified: 2026-03-19

Status: Draft
Owner: StackHunt Product + Editorial
Scope: `/tool/[slug]`

This blueprint defines render structure and section behavior for buyer-first tool pages. It complements, but does not replace, [Tool Page Standard v1](./TOOL_PAGE_STANDARD_V1.md).

## 1) Decision Job

Each page should feel like a concise buyer memo for one decision question:

- what this tool is
- who it is for
- who should avoid it
- what breaks first
- what forces an upgrade
- what to compare it against

## 2) Two-Layer Model

Decision layer appears first and stays compact:

1. Hero + immediate verdict card
2. Fit matrix by buyer type
3. Pricing reality
4. Before-you-buy tests (exactly three when present)
5. Alternatives as rebuttals
6. Proof-backed strengths and weaknesses

Reference layer appears after core decision sections:

1. Capability inventory (collapsed by default)
2. Integrations and operational details
3. FAQ (decision-supportive only)
4. Full trust, evidence, and update history

## 3) Above-the-Fold Contract

First screen must answer:

- what this tool is
- best for
- not for
- main risk
- upgrade trigger
- implementation friction

Hero composition:

- left: tool identity, one-line description, 3-5 tags, CTA cluster
- right: immediate verdict card
- trust details: compact strip only, full trust moved to footer

## 4) Section Rules

### Fit matrix

Rows:

- solo
- startup/small team
- mid-market
- enterprise

Each row needs:

- fit strength
- caveat
- reason

### Pricing reality

Required blocks:

- free works if
- paid needed when
- hidden cost triggers
- main cost drivers
- plan cards or explicit unknown state

### Before-you-buy tests

Render exactly three cards when this section is shown:

- one daily workflow test
- one admin/setup test
- one failure/export/edge-case test

Each card needs:

- why this matters
- what to do
- pass condition
- common failure

### Alternatives

Frame alternatives as rebuttals:

- "Choose X instead if..."

Each card needs one concrete differentiator angle, such as:

- cheaper at scale
- faster setup
- deeper automation
- stronger governance
- stronger developer control
- stronger reporting

### FAQ

Only render questions that materially support a buying decision:

- integrations
- exports
- implementation
- migration
- controls
- data ownership
- limits
- contracts

Suppress filler questions.

## 5) Disclosure and Trust UI

Trust should be visible but visually secondary to decision content.

- compact trust strip near verdict
- full trust and evidence in footer section

Footer trust should include:

- what we tested
- what we did not test
- source types
- pending claims
- last checked
- update history

## 6) Navigation

Use one combined decision toolbar:

- view lens control
- jump links to visible key sections

Do not keep separate top modules for reader controls and quick jump.

## 7) Progressive Disclosure Defaults

Default open:

- verdict
- pricing reality
- before-you-buy tests
- alternatives

Default collapsed:

- capability inventory
- full source list
- update history

## 8) Do Not

- introduce generic filler copy
- repeat the same claim across verdict, pricing, and capability sections
- make trust or research-status modules visually dominant above the fold
- place capability inventory before pricing/tests/alternatives
- invent precise implementation timelines without source-backed support
