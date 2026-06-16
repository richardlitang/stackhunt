# Homepage Redesign — "Decision Instrument"

**Date:** 2026-06-17
**Status:** Approved design, pending implementation plan
**Scope:** Redesign `src/pages/index.astro` and add a positive "anti-default" section to the global `frontend-design` skill.

## Problem

The current homepage (`src/pages/index.astro`) is competent but generic — it is, almost line-for-line, the canonical "AI-generated dark SaaS" look:

- `bg-zinc-950` + single indigo accent + 2%-opacity grid pattern (AI default look #2: near-black + one accent).
- Centered hero whose primary action is a **name-only search box** ("Search tools by name…") — it finds a tool but offers no decision value (no score, no verdict).
- Two stacked generic card grids ("Featured Tools", "Comparisons") each ending in "View all →".

The deeper problem is the **absence of a point of view**. Nothing on the page could only have come from StackHunt. The site's real assets — scored, honest, context-aware verdicts — are hidden behind a search box.

## Brand angle (decided)

**Decision speed:** "Pick the right tool in 60 seconds." The homepage should *make a decision with the user*, not send them searching. A search box is a directory/library mindset; this redesign replaces it with a decision instrument.

## Available data (verified in `src/lib/supabase.ts`)

- `getFeaturedItems(limit)` → `id, name, slug, logo_url, short_description, avg_score, pricing_type, verdict, base_score, category`.
- `getFeaturedContexts(limit)` → `id, title, slug, tool_count, category{name, slug, icon}`.
- `getCategories()` → full category rows (`name, slug, icon, display_order`, plus type taxonomy).

This is enough to surface **real scores and real verdict text** — no placeholders.

## Concept: the homepage IS a decision instrument

**Search stays the primary action** (user decision). Decision speed is served by making the
*search itself* a decision tool, plus a secondary quick-decide element — not by replacing search.

### Signature element — the "decision search" + verdict scorecard

The signature is the combination of: (1) a prominent search whose dropdown shows **real scores and
verdict one-liners** (not just names), and (2) the verdict-scorecard aesthetic carried through the
page. Search doesn't just find a tool — it shows you the call as you type.

**Primary: decision search (hero)**
- Keep the existing search box + autocomplete as the dominant hero action.
- Upgrade the autocomplete rows to show `avg_score` (mono, color-coded by verdict scale) and a
  truncated `verdict` one-liner alongside the name — so even search answers "is it worth it?"
- Requires adding `avg_score` and `verdict` to the cached select in
  `src/pages/api/search/tool-index.ts` (cheap; already server-cached).

**Secondary: quick-decide row (below search)**
- A lightweight "or jump to a decision: best `[ category ▾ ]` for `[ who/what ▾ ]` → Show me".
- Two compact dropdowns from real categories/contexts; resolves to the matching `/best/[slug]`.
- This is secondary chrome beneath the primary search, not the hero's main object.

**Resolution behavior (quick-decide):**
- Category dropdown lists real categories; the "for" dropdown lists audience/use contexts.
- On submit, resolve to the best-matching existing context slug. No-match fallback: `/best`
  (index exists at `src/pages/best/index.astro`). Exact resolution logic pinned during planning.
- Keyboard accessible; works without JS as a progressively-enhanced `<form>`.

### Below the fold — "The Verdicts" (show verdicts, not cards)

Replace the "Featured Tools" card grid with a **verdict row list** in a scorecard / spec-sheet aesthetic:

```
9.2 │ Linear   "Worth it if you live in your tracker"   $$   →
8.7 │ Figma    "The default for a reason"               free →
6.1 │ Tool X   "Skip unless you need Z"                  $$$  →
```

- Columns: score (mono, color-coded by verdict scale) · name · `verdict` one-liner · pricing signal · link.
- **Low scores stay visible (decided: keep)** — showing a 6.1 "skip unless…" is the proof of honesty and reinforces the speed promise ("we already did the deciding"). Kept tasteful: the strip is ordered high→low so it still reads as a credible ranking, not a wall of dunks; the rose color is used sparingly and only on the score.
- Sourced from `getFeaturedItems`. Rows, not floaty cards.

### "Decide faster" — contexts as decisions

Keep featured contexts but reframe from "Comparisons" to decision shortcuts ("best X for Y" lists), using `getFeaturedContexts`. Compact, mono `tool_count` metadata.

## Token system

### Color
- Base (warm near-black): `#0B0B0D`
- Surface (raised rows/cards): `#141417` with subtle warm border `#26241F`
- Text primary (warm off-white): `#EDEAE3`
- Text muted: `#9A968C`
- **Brand accent (amber/gold — "the pick is spotlighted"):** `#E8B14C`
- **Functional verdict scale (used ONLY on scores), separate from brand:**
  - High `#4ADE80` (emerald) · Mid `#E8B14C` (amber) · Low `#FB7185` (rose)

The deliberate separation of **brand color from data/functional color** is itself the signature discipline — the eye is drawn to scores, serving decision speed. Brand amber never decorates a score; score colors never act as brand chrome.

### Type
- **Display:** `Space Grotesk` (engineering character; deliberately not the existing Inter/Manrope default).
- **Body:** `Inter` (already loaded).
- **Data/utility (mono):** `Space Mono` or `IBM Plex Mono` — for scores, eyebrows, category tags, pricing, counts. The "spec-sheet / benchmark" voice that signals *decision tool*.

Fonts load via the existing Google Fonts link in `BaseLayout.astro`; update the font URL and preload accordingly.

### Layout
- Asymmetric, instrument-like. **Left-weighted hero**, not centered. The decision sentence is the dominant object.
- Verdict **rows** over a card grid.
- Eyebrow shows a real number (e.g., "N tools scored · updated daily") in mono.

### ASCII wireframe
```
┌──────────────────────────────────────────────┐
│ N tools scored · updated daily                 │  ← mono eyebrow, real number
│                                                │
│  [ 🔍 search tools…                       ⌘K ] │  ← PRIMARY: decision search
│   ┌── dropdown (on type) ──────────────────┐   │
│   │ 9.2 │ Linear  "Worth it if…"   $$       │   │  ← rows show score + verdict
│   └────────────────────────────────────────┘   │
│  or jump to: best [ cat ▾ ] for [ who ▾ ] → │   │  ← secondary quick-decide
├──────────────────────────────────────────────┤
│  THE VERDICTS                          all →   │
│  ┌──────────────────────────────────────────┐ │
│  │ 9.2 │ Linear   "Worth it if…"   $$  ●●●○  │ │
│  │ 8.7 │ Figma    "The default…"   free ●●●  │ │
│  │ 6.1 │ Tool X   "Skip unless…"   $$$ ●○○   │ │
│  └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────┤
│  DECIDE FASTER — popular "best X for Y" lists  │  ← contexts as decisions
└──────────────────────────────────────────────┘
```

## Copy direction

- Remove hedge-copy ("Honest reviews that help you choose").
- Confident, short, active voice. Sentence case.
- Eyebrow = real count, not a slogan.
- Verdict rows use the actual `verdict` one-liner from the DB.
- Section labels short and functional ("THE VERDICTS", "DECIDE FASTER").

## Demo-only banner (site-wide, first visit)

A dismissible "this site is a demo" notice shown on a visitor's **first load of any page** (not
homepage-only), so it must live in `BaseLayout.astro`, not `index.astro`.

- **Form:** a modal/popup overlay on first visit (per the request: "popup banner on first load").
  Centered card on a dimmed backdrop, warm-black surface + amber accent, one "Got it" dismiss action.
- **Once per visitor:** set a `localStorage` flag (e.g. `sh_demo_ack`) on dismiss; do not show again
  if the flag is present. Shown again only if storage is cleared.
- **Copy (plain, non-apologetic):** e.g. *"Heads up — StackHunt is a demo. Tools, scores, and
  verdicts are illustrative and may not reflect real products."* (final wording in planning.)
- **Accessibility:** focus moves to the dialog on open, ESC and the dismiss button close it, focus
  returns to body, `role="dialog"` + `aria-modal`, backdrop click closes. Respects
  `prefers-reduced-motion` for the fade/scale-in.
- **No-JS:** if JS is unavailable the modal simply never blocks content (progressive enhancement).
- New component: `src/components/DemoBanner.tsx` (React island, `client:load`) or an Astro component
  with inline script — decided in planning; React island preferred for focus management.

## Quality floor

- Responsive down to mobile (hero sentence stacks; dropdowns become full-width selects).
- Visible keyboard focus on dropdowns, submit, rows, links.
- `prefers-reduced-motion` respected for any reveal/hover motion.
- Progressive enhancement: the decision form works (degrades to a listing page) without JS.
- Backend query limits already enforced by the lib functions (`.limit()` present).

## Out of scope

- No changes to nav/header/footer beyond font wiring + the demo banner mount in `BaseLayout`.
- No new DB columns or RPCs — uses existing fields only (search index gains `avg_score`, `verdict`
  in its existing select; no schema change).
- No redesign of `/best`, `/tool`, `/compare` pages (only links into them).

## Skill improvement — global `frontend-design`

Location: edit the marketplace source
`~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md`,
then sync the cache copy at `~/.claude/plugins/cache/...` (cache is derived from marketplace; editing only the cache is overwritten on update).

The skill already *names* the three AI-default looks but gives no **positive** checklist for escaping them. Add a tight "anti-default" subsection with general (non-StackHunt) lessons drawn from this exercise:

1. **Separate brand color from functional/data color.** A decorative accent and a meaning-bearing scale are different jobs; conflating them is a default tell.
2. **Make the hero do the product's core job** — an instrument/live-demo beats a brochure headline when the product *is* an action.
3. **Show real data/verdicts over placeholder cards.** Generic card grids of name+blurb are a default tell; surfacing the product's actual output is distinctive by definition.
4. **Earn a mono/utility face** when the subject has data (scores, specs, metrics) — it encodes the subject's vernacular rather than decorating.

## Verification

- `npm run typecheck`, `npm run build`, `npm run test` must pass.
- Manual: homepage renders with real scores/verdicts; **search dropdown shows score + verdict**; quick-decide resolves to a real `/best/[slug]`; demo banner shows once then never again after dismiss (localStorage); keyboard + reduced-motion + no-JS fallbacks all work.
