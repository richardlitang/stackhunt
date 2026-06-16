# Homepage Decision-Instrument Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the StackHunt homepage as a "decision instrument" — search stays primary but becomes decision-aware (shows real score + verdict), backed by a verdict scorecard and a first-visit demo-only popup, on a distinct warm-black + amber identity.

**Architecture:** Pure, unit-tested helpers in `src/lib/homepage.ts` carry all formatting/resolution logic; `src/pages/index.astro` and the search index API consume them. The demo banner is a React island reusing the existing shadcn `Dialog`. A small named palette + font additions go in `tailwind.config.js` and `BaseLayout.astro`. No DB/schema changes.

**Tech Stack:** Astro 5, React 18, Tailwind, Vitest, Supabase client, shadcn/ui (`Dialog`, `Button`), lucide-react.

## Global Constraints

- **Score scale is 0–100** (`avg_score`, `base_score`). Display the integer (e.g. `92`), never a /10 value.
- **Verdict color scale = reuse `getScoreColor(score)` from `@/lib/utils`** (emerald/green/amber/orange/red). Do NOT introduce a parallel score-color system. Brand amber (`signal`) is decoration only and must never color a score.
- **Brand palette (Tailwind named tokens, added in Task 1):** `ink.950 #0B0B0D` (base), `ink.900 #141417` (surface), `ink.800 #1C1B1E` (raised), `ink.border #26241F`, `paper #EDEAE3` (text), `paper-muted #9A968C`, `signal #E8B14C` (amber brand accent).
- **Type:** display = `Space Grotesk` (`font-grotesk`), body = `Inter` (`font-sans`, already default), data/utility = `IBM Plex Mono` (`font-mono`). Mono is for scores, eyebrows, tags, pricing, counts.
- **Search stays the primary hero action.** The quick-decide sentence is secondary chrome below it.
- **Copy:** sentence case, active voice, no hedge-copy. Eyebrow shows a real count.
- **All Supabase queries keep `.limit()`** (existing lib functions already do).
- **Quality floor:** responsive to mobile, visible keyboard focus, `prefers-reduced-motion` respected, decision form + banner degrade gracefully without JS.
- **Tests:** Vitest, run with `npm run test`. Test files live under `tests/` mirroring `src/`. The `@/` alias resolves in tests.
- **Commits:** conventional commits, end with `Co-Authored-By: Claude <noreply@anthropic.com>`. Stage specific files, not `git add -A`.

---

### Task 1: Theme tokens — palette + fonts

**Files:**
- Modify: `tailwind.config.js` (`theme.extend.colors`, `theme.extend.fontFamily`)
- Modify: `src/layouts/BaseLayout.astro` (Google Fonts `<link>` + preload, ~lines 60-75)
- Test: `tests/config/theme-tokens.test.ts`

**Interfaces:**
- Produces: Tailwind classes `bg-ink-950 bg-ink-900 bg-ink-800 border-ink-border text-paper text-paper-muted text-signal bg-signal font-grotesk font-mono` available to all later tasks.

- [ ] **Step 1: Write the failing test**

```ts
// tests/config/theme-tokens.test.ts
import { describe, it, expect } from 'vitest';
import config from '../../tailwind.config.js';

describe('theme tokens', () => {
  it('defines the decision-instrument palette', () => {
    const colors = (config as any).theme.extend.colors;
    expect(colors.ink['950']).toBe('#0B0B0D');
    expect(colors.ink['900']).toBe('#141417');
    expect(colors.ink['800']).toBe('#1C1B1E');
    expect(colors.ink.border).toBe('#26241F');
    expect(colors.paper.DEFAULT).toBe('#EDEAE3');
    expect(colors.paper.muted).toBe('#9A968C');
    expect(colors.signal.DEFAULT).toBe('#E8B14C');
  });

  it('registers display and mono font families', () => {
    const fonts = (config as any).theme.extend.fontFamily;
    expect(fonts.grotesk[0]).toBe('Space Grotesk');
    expect(fonts.mono[0]).toBe('IBM Plex Mono');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/config/theme-tokens.test.ts`
Expected: FAIL (`Cannot read properties of undefined` / `ink` undefined).

- [ ] **Step 3: Add colors to `tailwind.config.js`**

Inside `theme.extend.colors`, after the `hunt` block, add:

```js
        ink: {
          950: '#0B0B0D',
          900: '#141417',
          800: '#1C1B1E',
          border: '#26241F',
        },
        paper: {
          DEFAULT: '#EDEAE3',
          muted: '#9A968C',
        },
        signal: {
          DEFAULT: '#E8B14C',
        },
```

- [ ] **Step 4: Add font families to `tailwind.config.js`**

In `theme.extend.fontFamily`, add these two keys (keep existing keys):

```js
        grotesk: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
```

- [ ] **Step 5: Load the fonts in `BaseLayout.astro`**

Replace the existing Google Fonts stylesheet `<link href="https://fonts.googleapis.com/css2?family=Inter...">` line with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
```

(Leave the existing Inter preload `<link rel="preload">` as-is.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- tests/config/theme-tokens.test.ts`
Expected: PASS (both tests).

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.js src/layouts/BaseLayout.astro tests/config/theme-tokens.test.ts
git commit -m "feat(homepage): add decision-instrument palette and font tokens

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Pure homepage helpers

**Files:**
- Create: `src/lib/homepage.ts`
- Test: `tests/lib/homepage.test.ts`

**Interfaces:**
- Produces (used by Tasks 3, 4, 5):
  - `formatScore(avgScore: number | null | undefined): string | null` — integer string `"92"`, or `null` if no usable score (`0`/null/undefined).
  - `truncateVerdict(verdict: string | null | undefined, max?: number): string` — trimmed, ellipsized at `max` (default 80); `''` if empty.
  - `resolveDecisionHref(contextSlug: string | null | undefined): string` — `/best/${slug}` when slug present, else `/best`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/homepage.test.ts
import { describe, it, expect } from 'vitest';
import { formatScore, truncateVerdict, resolveDecisionHref } from '@/lib/homepage';

describe('formatScore', () => {
  it('returns the integer string for a valid 0-100 score', () => {
    expect(formatScore(92)).toBe('92');
    expect(formatScore(7.6)).toBe('8');
  });
  it('returns null for missing or zero scores', () => {
    expect(formatScore(0)).toBeNull();
    expect(formatScore(null)).toBeNull();
    expect(formatScore(undefined)).toBeNull();
  });
});

describe('truncateVerdict', () => {
  it('returns trimmed verdict when short', () => {
    expect(truncateVerdict('  Worth it.  ')).toBe('Worth it.');
  });
  it('ellipsizes past the max length', () => {
    expect(truncateVerdict('a'.repeat(90), 80)).toBe('a'.repeat(80) + '…');
  });
  it('handles empty input', () => {
    expect(truncateVerdict(null)).toBe('');
    expect(truncateVerdict(undefined)).toBe('');
  });
});

describe('resolveDecisionHref', () => {
  it('builds a /best slug url', () => {
    expect(resolveDecisionHref('best-design-tools')).toBe('/best/best-design-tools');
  });
  it('falls back to /best when no slug', () => {
    expect(resolveDecisionHref(null)).toBe('/best');
    expect(resolveDecisionHref('')).toBe('/best');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/lib/homepage.test.ts`
Expected: FAIL (`Cannot find module '@/lib/homepage'`).

- [ ] **Step 3: Implement `src/lib/homepage.ts`**

```ts
/**
 * Pure helpers for the homepage decision instrument.
 * Scores are on a 0-100 scale (see avg_score). Color comes from getScoreColor.
 */

export function formatScore(avgScore: number | null | undefined): string | null {
  if (avgScore == null || avgScore <= 0) return null;
  return String(Math.round(avgScore));
}

export function truncateVerdict(verdict: string | null | undefined, max = 80): string {
  const text = (verdict ?? '').trim();
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

export function resolveDecisionHref(contextSlug: string | null | undefined): string {
  return contextSlug ? `/best/${contextSlug}` : '/best';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/lib/homepage.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/homepage.ts tests/lib/homepage.test.ts
git commit -m "feat(homepage): add pure score/verdict/decision helpers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Decision-aware search index API

**Files:**
- Modify: `src/pages/api/search/tool-index.ts` (type, select, mapper)
- Test: `tests/api/tool-index-mapper.test.ts`

**Interfaces:**
- Consumes: `formatScore`, `truncateVerdict` from `@/lib/homepage` (Task 2).
- Produces: `mapToolIndexEntry(row)` exported pure function; `ToolIndexEntry` now also has `score: string | null` and `verdict: string`. The client dropdown (Task 4) reads `item.score` and `item.verdict`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/tool-index-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { mapToolIndexEntry } from '@/pages/api/search/tool-index';

describe('mapToolIndexEntry', () => {
  it('maps a row to a decision-aware index entry', () => {
    const entry = mapToolIndexEntry({
      id: '1', name: 'Linear', slug: 'linear', logo_url: 'linear.app',
      short_description: 'Issue tracker', avg_score: 92, verdict: '  Worth it if you live in your tracker.  ',
    });
    expect(entry).toEqual({
      id: '1', name: 'Linear', slug: 'linear', logo_url: 'linear.app',
      short_description: 'Issue tracker', score: '92',
      verdict: 'Worth it if you live in your tracker.',
    });
  });
  it('nulls out missing score and empty verdict', () => {
    const entry = mapToolIndexEntry({
      id: '2', name: 'X', slug: 'x', logo_url: null, short_description: null,
      avg_score: 0, verdict: null,
    });
    expect(entry.score).toBeNull();
    expect(entry.verdict).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/api/tool-index-mapper.test.ts`
Expected: FAIL (`mapToolIndexEntry` not exported).

- [ ] **Step 3: Update the type and add the pure mapper**

In `src/pages/api/search/tool-index.ts`, add the import at top and extend the type:

```ts
import { formatScore, truncateVerdict } from '@/lib/homepage';

type ToolIndexEntry = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  short_description: string | null;
  score: string | null;
  verdict: string;
};

export function mapToolIndexEntry(row: {
  id: string; name: string; slug: string;
  logo_url: string | null; short_description: string | null;
  avg_score: number | null; verdict: string | null;
}): ToolIndexEntry {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url || null,
    short_description: row.short_description || null,
    score: formatScore(row.avg_score),
    verdict: truncateVerdict(row.verdict, 70),
  };
}
```

- [ ] **Step 4: Use the mapper and enrich the select**

In `loadToolIndex`, change the select to include the new columns and use the mapper:

```ts
    const { data, error } = await supabase
      .from('items')
      .select('id, name, slug, logo_url, short_description, avg_score, verdict')
      .eq('type', 'tool')
      .not('slug', 'is', null)
      .order('name', { ascending: true })
      .limit(MAX_TOOL_INDEX_SIZE);

    if (error) throw error;

    const items = (data || []).map((row) => mapToolIndexEntry(row as any));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- tests/api/tool-index-mapper.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/api/search/tool-index.ts tests/api/tool-index-mapper.test.ts
git commit -m "feat(search): make tool index decision-aware (score + verdict)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Hero — decision search (primary) + quick-decide (secondary)

**Files:**
- Modify: `src/pages/index.astro` (hero `<section>` ~lines 40-154; inline suggestion script ~lines 335-440)

**Interfaces:**
- Consumes: `categories` (already fetched), `featuredContexts` (already fetched), `resolveDecisionHref` (server-side import from `@/lib/homepage`), the enriched search index (`item.score`, `item.verdict`) from Task 3.
- Produces: rendered hero markup using the Task 1 palette/fonts. No new exports.

- [ ] **Step 1: Compute hero data in the frontmatter**

In `src/pages/index.astro` frontmatter, compute a real eyebrow count + quick-decide option lists from already-fetched data (place after the existing `const quickContextLinks = ...` line). No new import is needed here — the quick-decide href is built client-side in the inline script (Step 4), and `resolveDecisionHref` is exercised by its own unit test:

```ts
const toolCount = featuredTools.length;
const decideCategories = categories.slice(0, 12);
const decideContexts = featuredContexts.slice(0, 12);
```

Then delete the now-unused `const quickContextLinks = featuredContexts.slice(0, 3);` line — the old hero "Popular:" links that used it are removed in Step 2 (otherwise it becomes an unused variable).

- [ ] **Step 2: Replace the hero section markup**

Replace the entire `<!-- Hero Section -->` `<section>...</section>` (lines ~40-154) with:

```astro
  <!-- Hero: decision search -->
  <section class="relative overflow-hidden bg-ink-950">
    <div class="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <p class="font-mono text-xs uppercase tracking-[0.18em] text-paper-muted">
        {toolCount}+ tools scored · updated daily
      </p>

      <h1 class="mt-4 max-w-2xl font-grotesk text-4xl font-semibold leading-[1.05] tracking-tight text-paper sm:text-5xl">
        Stop researching. <span class="text-signal">See the verdict.</span>
      </h1>
      <p class="mt-4 max-w-xl text-base text-paper-muted">
        Search any tool and get the call — score, price, and whether it's worth it — before you open a single tab.
      </p>

      <!-- Primary: decision search -->
      <div class="mt-8 max-w-xl">
        <form action="/tools" method="get" class="relative" id="home-search-form">
          <input
            id="home-tools-search"
            type="text"
            name="q"
            autocomplete="off"
            aria-label="Search tools by name"
            aria-autocomplete="list"
            aria-controls="home-tool-suggestions"
            aria-expanded="false"
            minlength="2"
            maxlength="64"
            placeholder="Search any tool…"
            class="w-full rounded-xl border border-ink-border bg-ink-900 py-3.5 pl-11 pr-4 text-base text-paper placeholder-paper-muted transition focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal/50"
          />
          <svg class="absolute left-3.5 top-4 h-5 w-5 text-paper-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <kbd class="absolute right-3 top-3 hidden rounded border border-ink-border bg-ink-800 px-1.5 py-0.5 font-mono text-xs text-paper-muted sm:inline-block">⌘K</kbd>

          <div
            id="home-tool-suggestions"
            role="listbox"
            aria-label="Tool suggestions"
            class="absolute left-0 right-0 top-full z-20 mt-3 hidden overflow-hidden rounded-2xl border border-ink-border bg-ink-950/95 shadow-2xl backdrop-blur-sm"
          >
            <div id="home-tool-suggestions-list" class="max-h-96 overflow-y-auto p-2"></div>
            <div id="home-tool-suggestions-footer" class="border-t border-ink-border px-4 py-2.5 font-mono text-xs text-paper-muted">
              Press Enter to search all tools
            </div>
          </div>
        </form>
      </div>

      <!-- Secondary: quick-decide -->
      <form id="home-decide-form" class="mt-4 flex flex-wrap items-center gap-2 text-sm text-paper-muted">
        <span>or jump to a decision —</span>
        <span>best</span>
        <select id="decide-category" aria-label="Category" class="rounded-lg border border-ink-border bg-ink-900 px-2.5 py-1.5 text-paper focus:border-signal focus:outline-none">
          {decideCategories.map((cat) => <option value={cat.slug}>{cat.name}</option>)}
        </select>
        <span>for</span>
        <select id="decide-context" aria-label="Use case" class="rounded-lg border border-ink-border bg-ink-900 px-2.5 py-1.5 text-paper focus:border-signal focus:outline-none">
          {decideContexts.map((ctx) => <option value={ctx.slug}>{ctx.title}</option>)}
        </select>
        <button type="submit" class="rounded-lg bg-signal px-3 py-1.5 font-medium text-ink-950 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-signal/50">
          Show me →
        </button>
        <noscript><a href="/best" class="underline">Browse all lists →</a></noscript>
      </form>
    </div>
  </section>
```

- [ ] **Step 3: Update the suggestion-row renderer to show score + verdict**

In the inline `<script is:inline>`, inside `renderSuggestions`, locate the block that builds the `badge` element (`badge.textContent = 'Tool'`). Replace that badge creation with a score chip, and add a verdict line. Specifically, replace:

```js
        const badge = document.createElement('div');
        badge.className =
          'mt-0.5 shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900/90 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400';
        badge.textContent = 'Tool';
```

with:

```js
        const badge = document.createElement('div');
        badge.className =
          'mt-0.5 shrink-0 rounded-md border border-ink-border bg-ink-900 px-2 py-1 font-mono text-xs font-semibold text-paper';
        badge.textContent = tool.score ? tool.score : '—';
```

Then, replace the `short_description` block (the part that builds `desc` from `tool.short_description`) so it prefers the verdict:

```js
        const verdictText = typeof tool.verdict === 'string' ? tool.verdict.trim() : '';
        const fallback = typeof tool.short_description === 'string' ? tool.short_description.trim() : '';
        const line = verdictText || fallback;
        if (line) {
          const desc = document.createElement('div');
          desc.className = 'mt-2 line-clamp-2 pr-1 text-sm leading-5 text-paper-muted';
          desc.textContent = line.length > 120 ? `${line.slice(0, 117).trim()}…` : line;
          body.append(desc);
        }
```

Also update the icon/row/empty-state class strings in this script from `zinc-*` to the `ink`/`paper` tokens (icon container, row hover, empty state) so the dropdown matches the new palette. (Search-and-replace `zinc-800/zinc-900/zinc-100/zinc-300/zinc-400/zinc-500/zinc-700` within the script with the closest `ink`/`paper` token.)

- [ ] **Step 4: Add the quick-decide submit handler**

At the end of the inline `<script is:inline>` (before its closing), add:

```js
  document.addEventListener('DOMContentLoaded', () => {
    const decideForm = document.getElementById('home-decide-form');
    const ctxSelect = document.getElementById('decide-context');
    if (decideForm instanceof HTMLFormElement && ctxSelect instanceof HTMLSelectElement) {
      decideForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const slug = ctxSelect.value;
        window.location.href = slug ? `/best/${encodeURIComponent(slug)}` : '/best';
      });
    }
  });
```

- [ ] **Step 5: Build to verify the hero compiles**

Run: `npm run build`
Expected: build succeeds (Astro compiles `index.astro` with no errors).

- [ ] **Step 6: Manual check**

Run `npm run dev`, open `http://localhost:4321`. Verify: eyebrow shows a real count; typing ≥2 chars shows dropdown rows with a score chip + verdict line; quick-decide "Show me" navigates to `/best/<slug>`; keyboard focus rings visible; with JS disabled the `<noscript>` link is present.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(homepage): decision-search hero with quick-decide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: "The Verdicts" + "Decide faster" sections

**Files:**
- Modify: `src/pages/index.astro` (replace Categories / Featured Tools / Comparisons sections ~lines 156-246)

**Interfaces:**
- Consumes: `featuredTools` (has `avg_score`, `verdict`, `pricing_type`, `category`), `featuredContexts`, `getScoreColor` from `@/lib/utils`, `formatScore`/`truncateVerdict` from `@/lib/homepage`.
- Produces: rendered sections. No new exports.

- [ ] **Step 1: Import helpers in frontmatter**

Add to `src/pages/index.astro` frontmatter imports:

```ts
import { getScoreColor } from '@/lib/utils';
import { formatScore, truncateVerdict } from '@/lib/homepage';
import { formatPricingType } from '@/lib/utils';
```

(If `formatPricingType` is already imported elsewhere, don't duplicate.)

- [ ] **Step 2: Replace the Categories + Featured Tools + Comparisons sections**

Replace everything from `<!-- Categories Section -->` through the end of the Comparisons block (the closing `)}` of the contexts conditional, ~lines 156-246) with:

```astro
  <!-- Category strip -->
  <section class="border-y border-ink-border bg-ink-900 py-4">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-3 overflow-x-auto scrollbar-hide">
        <span class="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-paper-muted">Browse</span>
        {categories.slice(0, 10).map((cat) => (
          <a href={`/categories/${cat.slug}`} class="shrink-0 rounded-lg border border-ink-border bg-ink-900 px-3 py-1.5 text-sm text-paper-muted transition hover:border-signal/50 hover:text-paper">
            {cat.name}
          </a>
        ))}
        <a href="/categories" class="shrink-0 text-sm text-paper-muted transition hover:text-paper">View all →</a>
      </div>
    </div>
  </section>

  <!-- The Verdicts -->
  <section class="bg-ink-950 py-12">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="font-grotesk text-2xl font-semibold text-paper">The verdicts</h2>
          <p class="mt-1 text-sm text-paper-muted">What's worth it — and what isn't.</p>
        </div>
        <a href="/tools" class="text-sm text-paper-muted transition hover:text-paper">All tools →</a>
      </div>

      <div class="mt-6 divide-y divide-ink-border overflow-hidden rounded-xl border border-ink-border">
        {featuredTools.map((tool) => {
          const score = formatScore(tool.avg_score);
          const colors = getScoreColor(tool.avg_score || 0);
          const verdict = truncateVerdict(tool.verdict, 90);
          return (
            <a href={`/tool/${tool.slug}`} class="group flex items-center gap-4 bg-ink-900 px-4 py-3.5 transition hover:bg-ink-800">
              <span class={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border font-mono text-base font-semibold ${colors.bg} ${colors.text} ${colors.border}`}>
                {score ?? '—'}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="truncate font-grotesk text-[15px] font-semibold text-paper">{tool.name}</span>
                  {tool.category && <span class="shrink-0 font-mono text-xs text-paper-muted">{tool.category.name}</span>}
                </div>
                {verdict && <p class="mt-0.5 truncate text-sm text-paper-muted">{verdict}</p>}
              </div>
              <span class="hidden shrink-0 font-mono text-xs uppercase tracking-wider text-paper-muted sm:inline">{formatPricingType(tool.pricing_type)}</span>
              <span class="shrink-0 text-paper-muted transition group-hover:text-signal">→</span>
            </a>
          );
        })}
      </div>
    </div>
  </section>

  <!-- Decide faster -->
  {featuredContexts && featuredContexts.length > 0 && (
    <section class="border-t border-ink-border bg-ink-900 py-12">
      <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between">
          <div>
            <h2 class="font-grotesk text-2xl font-semibold text-paper">Decide faster</h2>
            <p class="mt-1 text-sm text-paper-muted">Pre-built "best X for Y" calls.</p>
          </div>
          <a href="/best" class="text-sm text-paper-muted transition hover:text-paper">All lists →</a>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredContexts.map((ctx) => (
            <a href={`/best/${ctx.slug}`} class="group rounded-xl border border-ink-border bg-ink-950 p-4 transition hover:border-signal/50">
              <h3 class="font-grotesk text-sm font-semibold text-paper group-hover:text-signal">{ctx.title}</h3>
              <p class="mt-1 font-mono text-xs text-paper-muted">{ctx.tool_count} tools compared</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )}
```

- [ ] **Step 3: Remove now-dead "show more" markup/script/style**

The verdict list shows all `featuredTools` as rows (no mobile truncation needed). Remove the `#show-more-tools` button block (if it was inside the replaced range it's already gone), the `show-more-tools` handler at the bottom of the inline script, and the `.hidden-on-mobile` `@media` rules in the `<style>` block. Leave `.scrollbar-hide` (still used by the category strip).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual check**

`npm run dev` → homepage shows verdict rows with color-coded 0–100 scores (low scores render with the red/orange treatment), category name, verdict line, pricing, ordered as returned (high→low by `avg_score`). "Decide faster" shows context cards with `N tools compared`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(homepage): verdict scorecard and decide-faster sections

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Demo-only first-visit popup

**Files:**
- Create: `src/components/DemoBanner.tsx`
- Create: `src/lib/demo-banner.ts`
- Modify: `src/layouts/BaseLayout.astro` (mount the island near `MyStackWidget`, ~line 117)
- Test: `tests/lib/demo-banner.test.ts`

**Interfaces:**
- Produces: `shouldShowDemoBanner(storageValue: string | null): boolean` (pure, in `src/lib/demo-banner.ts`); `DEMO_BANNER_KEY = 'sh_demo_ack'`. `DemoBanner` React component (default export) reusing shadcn `Dialog`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/demo-banner.test.ts
import { describe, it, expect } from 'vitest';
import { shouldShowDemoBanner, DEMO_BANNER_KEY } from '@/lib/demo-banner';

describe('shouldShowDemoBanner', () => {
  it('shows when no acknowledgement stored', () => {
    expect(shouldShowDemoBanner(null)).toBe(true);
  });
  it('does not show once acknowledged', () => {
    expect(shouldShowDemoBanner('1')).toBe(false);
  });
  it('uses a stable storage key', () => {
    expect(DEMO_BANNER_KEY).toBe('sh_demo_ack');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/lib/demo-banner.test.ts`
Expected: FAIL (`Cannot find module '@/lib/demo-banner'`).

- [ ] **Step 3: Implement the pure gate**

```ts
// src/lib/demo-banner.ts
export const DEMO_BANNER_KEY = 'sh_demo_ack';

export function shouldShowDemoBanner(storageValue: string | null): boolean {
  return storageValue == null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/lib/demo-banner.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the `DemoBanner` island**

```tsx
// src/components/DemoBanner.tsx
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DEMO_BANNER_KEY, shouldShowDemoBanner } from '@/lib/demo-banner';

export default function DemoBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (shouldShowDemoBanner(window.localStorage.getItem(DEMO_BANNER_KEY))) {
        setOpen(true);
      }
    } catch {
      /* storage unavailable — never block content */
    }
  }, []);

  const acknowledge = () => {
    try {
      window.localStorage.setItem(DEMO_BANNER_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) acknowledge(); }}>
      <DialogContent className="border-ink-border bg-ink-900 text-paper">
        <DialogHeader>
          <DialogTitle className="font-grotesk">Heads up — this is a demo</DialogTitle>
          <DialogDescription className="text-paper-muted">
            StackHunt is a demonstration. Tools, scores, and verdicts are illustrative and may not reflect real products or current pricing.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge} className="bg-signal text-ink-950 hover:brightness-110">Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Mount the island in `BaseLayout.astro`**

Add the import alongside the existing `MyStackWidget` import:

```ts
import DemoBanner from '@/components/DemoBanner';
```

And add the mount right after `<MyStackWidget client:load />`:

```astro
    <DemoBanner client:load />
```

- [ ] **Step 7: Build + manual check**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`: on first load (clear localStorage / incognito) the dialog appears on any page; "Got it" or ESC or backdrop dismisses it; reload → it does not reappear; focus is trapped in the dialog while open (provided by shadcn `Dialog`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/demo-banner.ts src/components/DemoBanner.tsx src/layouts/BaseLayout.astro tests/lib/demo-banner.test.ts
git commit -m "feat: first-visit demo-only popup banner

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: frontend-design skill — "anti-default" checklist

**Files:**
- Modify: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md`
- Sync: copy the edited file to `~/.claude/plugins/cache/claude-plugins-official/frontend-design/unknown/skills/frontend-design/SKILL.md`

**Interfaces:** none (documentation/skill change).

- [ ] **Step 1: Add the anti-default subsection**

In the marketplace `SKILL.md`, immediately after the calibration paragraph that lists the three AI-default looks (ends with "...take each project as a chance to experiment and learn."), insert:

```markdown
### Positive checklist: escaping the defaults

Naming the default looks isn't enough — these moves actively produce a point of view:

1. **Separate brand color from functional/data color.** A decorative accent and a meaning-bearing scale (scores, status, deltas) are different jobs. Conflating them — letting the one bright accent also stand in for "good" — is a default tell. Give data its own scale and keep the brand accent for emphasis only.
2. **Make the hero do the product's core job.** If the product *is* an action (search, decide, convert, generate), the hero should perform a small real instance of it — an instrument or live moment — not describe it with a headline and a screenshot.
3. **Show real data and real verdicts over placeholder cards.** A grid of name + one-line blurb cards is a default tell. Surfacing the product's actual output (a score, a ranking, a generated result, a real number) is distinctive by definition and earns trust.
4. **Earn a utility/mono typeface when the subject has data.** When the world includes scores, specs, metrics, or code, a mono face for those values encodes the subject's vernacular instead of decorating — but only where data actually lives.
```

- [ ] **Step 2: Sync the cache copy**

Run:

```bash
cp "$HOME/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md" "$HOME/.claude/plugins/cache/claude-plugins-official/frontend-design/unknown/skills/frontend-design/SKILL.md"
```

Expected: no output (success). Verify both files match:

```bash
diff "$HOME/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md" "$HOME/.claude/plugins/cache/claude-plugins-official/frontend-design/unknown/skills/frontend-design/SKILL.md" && echo IN_SYNC
```

Expected: `IN_SYNC`.

- [ ] **Step 3: No commit**

These files live outside the repo (`~/.claude/...`), so there is nothing to commit in the project. Note completion in the final summary instead.

---

### Task 8: Final verification gate

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Tests**

Run: `npm run test`
Expected: all pass (including the four new test files).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual smoke checklist**

`npm run dev`, then confirm:
- [ ] Homepage uses warm-black/amber identity; nav/footer seam is acceptable.
- [ ] Eyebrow shows a real tool count.
- [ ] Search dropdown shows score chip + verdict line per row.
- [ ] Quick-decide "Show me" → `/best/<slug>`; no-JS shows the `<noscript>` link.
- [ ] Verdict rows show color-coded 0–100 scores incl. at least one low/red score.
- [ ] Demo popup shows once (incognito), dismisses via button/ESC/backdrop, doesn't reappear after reload.
- [ ] Keyboard focus visible throughout; `prefers-reduced-motion` shows no jarring motion.

- [ ] **Step 5: No code changes** — if any check fails, return to the owning task.

---

## Notes / deviations from spec

- **Verdict color scale:** the spec proposed custom hex (`#4ADE80 / #E8B14C / #FB7185`); the plan reuses the existing `getScoreColor()` (0–100 → emerald/green/amber/orange/red) instead, for DRY and site-wide consistency. Brand amber (`signal`) stays decoration-only, preserving the spec's core "brand ≠ data color" principle.
- **Score scale:** spec wireframe showed `9.2`; actual data is 0–100, so verdicts display integers (`92`).
- **Demo banner form:** implemented via the existing shadcn `Dialog` (focus trap, ESC, aria-modal handled by the primitive) rather than a hand-rolled modal.
