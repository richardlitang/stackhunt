# Tool Page Editorial Blueprint v2

Last verified: 2026-03-05

Status: Proposed  
Scope: `/tool/[slug]` only  
Primary Goal: make pages read like buyer guidance, not product spec sheets.

## 1) Reader Job

A reader should answer this in under 30 seconds:
- Should I shortlist this tool for my use case right now?

A reader should answer this in under 3 minutes:
- What will likely go wrong?
- What will this cost at my team shape?
- Which alternative should I look at next?

## 2) Narrative-First Page Shape

Render in this order:
1. Decision hero
2. Why it wins / why it loses (scenario-based)
3. Cost reality (buyer-facing, not raw matrix first)
4. Setup and rollout risk
5. Best alternatives by reason
6. Evidence and freshness
7. Deep specs (collapsed)

## 3) Decision Hero Contract

Must contain:
- Intent-aligned title: `"[Tool] Review: Should [persona] use it?"`
- One-paragraph decision answer (2-4 sentences)
- `Best fit` and `Skip if` with concrete triggers
- `Starting cost` + confidence + last checked date
- Single primary CTA + alternatives CTA

Must not contain:
- Source count bragging
- Multiple verdict boxes
- Long methodology in first viewport
- Internal scoring mechanics

## 4) Copy Rules

Must:
- Use concrete nouns, constraints, and thresholds
- Include one explicit downside in first paragraph
- Explain tradeoffs with buyer consequences
- Use uncertainty labels when needed (`Not confirmed`)

Must not:
- Use generic filler (`robust solution`, `worth shortlisting`, `great for teams`)
- Repeat the same claim in 3+ sections
- State unsupported negatives as facts

## 5) Section Budgets (Hard Limits)

- Above fold: max 180 words
- Why choose: 3-5 points, each <= 22 words
- Why skip: 2-4 points, each <= 22 words
- Pricing narrative: max 140 words before any table
- Community block: max 3 signals, no decorative filler
- Visible sections before fold break: max 4

## 6) Pricing Presentation Rules

Order:
1. Buyer-facing pricing takeaway paragraph
2. 2-3 cost drivers with impact language
3. Compact pricing table or plan cards
4. Source link + checked date

Do not open with a long 10+ row seat matrix without context.

## 7) Consistency Rules

If a published review exists and newer draft content exists:
- Public page shows published narrative only
- Draft narrative never mixes into public view

If pricing was refreshed without full review refresh:
- Keep verdict scope language constrained
- Show pricing freshness as pricing-only update

## 8) Quality Gate Additions

New blockers:
- duplicate verdict surfaces above-the-fold
- list-heavy ratio violation (too many bullets, too little narrative)
- contradictory claims across verdict/pros/cons/pricing
- incomplete phrase artifacts (`"Price increase of approximately..."`)

New warnings:
- section bloat (too many cards)
- low source diversity for decisive claims

## 9) Success Metrics

For sampled tool pages:
- 0 contradictory critical claims
- 0 generic-verdict blockers
- <= 1 duplicated top-level claim across sections
- pass new rendered narrative gate

## 10) Initial Pilot Set

Run v2 against:
- Figma
- Zapier
- Airtable
- Asana
- Discord
