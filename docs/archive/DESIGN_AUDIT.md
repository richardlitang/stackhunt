# StackHunt Design Audit & Improvement Plan

**Date:** 2026-01-30
**Scope:** Tool pages, Best lists, Compare pages, Categories

---

## Executive Summary

The current design is functional but lacks visual hierarchy, breathing room, and modern polish. Key issues:
- **Information density:** Too cramped, needs better spacing
- **Visual hierarchy:** All sections look equally important
- **CTA visibility:** Primary actions get lost in the layout
- **Mobile experience:** Not optimized for small screens
- **Inconsistent theming:** Homepage is dark zinc-950, pages are light slate

---

## 🔍 Page-by-Page Analysis

### 1. Tool Detail Page (`/tool/[slug]`)

#### Current Issues

**Hero Section** (lines 94-152)
- ❌ Score badge and CTA buttons are buried on the right
- ❌ Logo is too small (xl = 80px) for a hero
- ❌ Tags crowd the description area
- ❌ Compare/Add to Stack buttons are secondary style but equally important as primary CTA

**Content Layout** (lines 154-260)
- ❌ "Our Analysis" before "About" creates confusion (which is the intro?)
- ❌ Sidebar "Quick Stats" duplicates info from hero
- ❌ Vote widget is in awkward position (mid-content)
- ❌ Source attribution is tiny and easy to miss
- ❌ All sections use identical card styling (no visual differentiation)

**Pros/Cons Section** (lines 202-216)
- ✅ ProsCons component is well-designed with source attribution
- ❌ Empty state is too apologetic ("we're working on it")
- ❌ Section feels disconnected from other content

**Spiderweb Section** (lines 262-267)
- ❌ No visual separation from main content
- ❌ "Related contexts" unclear label

#### Recommended Improvements

**Hero Redesign:**
```
┌─────────────────────────────────────────────────┐
│ 🏢 [LOGO-XL]  ProductName ✓                    │
│               Tagline/short description          │
│                                                  │
│ 🏷️ Category • 💰 Pricing • 🌐 Website         │
│ 🏷️ [Tag] [Tag] [Tag]                          │
│                                                  │
│ ┌─────────────────────┐  ┌──────┐              │
│ │ 🎯 Primary CTA btn │  │ 85/100│             │
│ └─────────────────────┘  └──────┘              │
│ [Compare] [Add to Stack]                        │
└─────────────────────────────────────────────────┘
```

**Content Hierarchy:**
1. **Video** (if exists) - Full width, engaging
2. **Key Highlights** - 3-column cards: Score breakdown, Quick facts, Pricing
3. **About** - The real introduction
4. **Pros & Cons** - Prominent, scannable
5. **Our Analysis** - Deeper dive after basics
6. **Related Tools** - Internal linking
7. **See it in Context** - Spiderweb grid

**Visual Polish:**
- Increase spacing between sections (gap-12 instead of gap-8)
- Add subtle shadows to differentiate cards (`shadow-sm hover:shadow-md`)
- Use accent colors for different section types:
  - Info: blue-50 backgrounds
  - Analysis: purple-50 backgrounds
  - Community: amber-50 backgrounds
- Make primary CTA larger and more prominent
- Sticky sidebar on desktop (position: sticky)

---

### 2. Best List Page (`/best/[slug]`)

#### Current Issues

**Header** (lines 100-155)
- ❌ Tool count number is huge but not meaningful at a glance
- ❌ "Alternatives to" box feels like an afterthought
- ❌ No visual indication this is a ranked list

**Tool Cards** (lines 168-320)
- ✅ Rank badges are nice touch
- ❌ Cards are too tall - lots of wasted space
- ❌ Pros/Cons hidden behind details/summary
- ❌ Summary hidden behind second details/summary
- ❌ Two-column layout on desktop wastes space

**Empty State** (lines 324-334)
- ✅ Friendly tone

#### Recommended Improvements

**Header Enhancement:**
```
┌────────────────────────────────────────────┐
│ 🏆 Best X Tools for Y                     │
│ Compared 12 tools • Updated Jan 2026      │
│                                            │
│ [Intro paragraph with context]            │
│                                            │
│ 💡 Looking for alternatives to Slack?     │
│    [See comparison →]                      │
└────────────────────────────────────────────┘
```

**Card Redesign - Compact Ranks:**
```
┌─────────────────────────────────────────┐
│ #1 🥇 ProductName        [85/100] [CTA]│
│ Logo  Tagline here                      │
│                                         │
│ ✓ Pro 1   ✓ Pro 2   ✓ Pro 3          │
│ ✗ Con 1   ✗ Con 2                     │
│                                         │
│ [Expand for full analysis ↓]           │
└─────────────────────────────────────────┘
```

**Layout:**
- Single column, wider cards (max-w-4xl)
- Show top 3 pros/cons by default
- Expandable full analysis
- Add "Compare top 3" button at the top

---

### 3. Compare Page (`/compare/[...slugs]`)

#### Current Issues

**Header** (lines 166-197)
- ✅ Quick verdict banner is good
- ❌ Banner styling too subtle

**Side-by-Side Layout** (lines 200-394)
- ❌ Text-heavy, hard to scan
- ❌ No visual differentiation between "winner" and "loser"
- ❌ Pros/Cons use + and - symbols (use checkmarks/X)
- ❌ No quick at-a-glance comparison

**Key Differences Table** (lines 396-457)
- ✅ Good idea for structured comparison
- ❌ Table feels disconnected from cards above
- ❌ Limited to 3 aspects (score, pricing, highlights)

#### Recommended Improvements

**Top Section - Quick Verdict:**
```
┌──────────────────────────────────────────────┐
│ ⭐ WINNER: ProductA (85/100)               │
│ Better performance, lower price             │
└──────────────────────────────────────────────┘
```

**Comparison Matrix View:**
```
┌─────────────────┬────────────────┬────────────────┐
│ Feature         │ ProductA    ✓  │ ProductB       │
├─────────────────┼────────────────┼────────────────┤
│ Score           │ 85/100      ✓  │ 72/100         │
│ Pricing         │ $20/mo         │ $35/mo      ✓  │
│ Performance     │ Fast        ✓  │ Slow           │
│ Support         │ 24/7        ✓  │ Business hours │
│ Mobile App      │ Yes         ✓  │ Yes         ✓  │
└─────────────────┴────────────────┴────────────────┘
```

**Pros/Cons Enhancement:**
- Show side-by-side, but highlighted
- Use color coding (green for winning in each category)
- Add "Unique to X" section

---

### 4. Categories & Tools Index

#### Current Issues

**Categories Index** (`/categories/index`)
- ✅ Clean grid layout
- ❌ No search/filter (per your request)
- ❌ No indication of tool count per category

**Tools Index** (`/tools/index`)
- ✅ Filter and sort work (after our fix)
- ❌ 4-column grid too cramped on desktop
- ❌ No preview of tools on hover
- ❌ Pagination is basic

#### Recommended Improvements

**Categories:**
- Add instant search (client-side filter)
- Show tool count badges
- Group by type (function/audience/platform)

**Tools:**
- 3-column grid (better card size)
- Add hover preview card
- Infinite scroll option
- Show applied filters clearly

---

## 🎨 Design System Recommendations

### Colors

**Current:** Light slate theme with hunt-500 accent
**Problem:** Inconsistent with dark homepage

**Recommendation:** Unified theme with light mode

```css
/* Primary Palette */
--hunt-50: #fef5ee;    /* Lightest - backgrounds */
--hunt-100: #fde9d8;   /* Light - hover states */
--hunt-500: #ea6f3d;   /* Primary - CTAs */
--hunt-600: #d9540f;   /* Dark - hover */
--hunt-700: #b04108;   /* Darkest - text */

/* Neutrals (keep slate) */
--slate-50 to --slate-900

/* Semantic Colors */
--success: emerald-500  /* Scores 70+ */
--warning: amber-500    /* Scores 50-69 */
--danger: red-500       /* Scores <50 */
```

### Typography

**Current:** Mix of text-sm, text-base, text-lg
**Problem:** Inconsistent hierarchy

**Recommendation:**
```
Page Title (H1):    text-3xl sm:text-4xl font-bold
Section Title (H2): text-2xl font-semibold
Card Title (H3):    text-xl font-semibold
Body:               text-base leading-relaxed
Small:              text-sm
Caption:            text-xs text-slate-500
```

### Spacing

**Current:** Inconsistent gaps (gap-3, gap-4, gap-6, gap-8)
**Recommendation:** Stick to scale

```
Components:  gap-4
Sections:    gap-12
Page:        py-12 lg:py-16
Cards:       p-6 lg:p-8
```

### Cards & Borders

**Current:** All cards look the same
**Recommendation:**

```css
/* Default Card */
.card {
  @apply rounded-xl border border-slate-200 bg-white p-6;
}

/* Interactive Card */
.card-interactive {
  @apply card transition-all duration-200;
  @apply hover:border-slate-300 hover:shadow-lg;
}

/* Elevated Card */
.card-elevated {
  @apply card shadow-md;
}

/* Highlighted Card (featured/winner) */
.card-highlight {
  @apply card border-2 border-hunt-200 bg-hunt-50/30;
}
```

---

## 📱 Mobile Optimization

### Critical Fixes Needed

1. **Hero sections:**
   - Stack vertically on mobile
   - Larger touch targets (min 44px)
   - CTA buttons full-width on mobile

2. **Comparison pages:**
   - Switch to tabbed view instead of side-by-side
   - Swipeable cards

3. **Tables:**
   - Horizontal scroll with sticky first column
   - Or collapse to accordion on mobile

4. **Navigation:**
   - Sticky header on scroll
   - Bottom nav for main actions

---

## 🚀 Quick Wins (Implement First)

### Priority 1 - Immediate Impact
1. **Increase spacing** - Change all `gap-8` to `gap-12` between major sections
2. **Enlarge CTAs** - Make primary buttons larger (`px-6 py-3` instead of `px-4 py-2`)
3. **Add shadows** - Differentiate cards with `shadow-sm hover:shadow-lg`
4. **Sticky sidebar** - Make Quick Stats follow scroll on tool pages

### Priority 2 - Visual Polish
5. **Consistent card heights** - Use `aspect-ratio` or `min-h-*` for grids
6. **Better empty states** - Less apologetic, more actionable
7. **Loading states** - Add skeleton screens
8. **Hover effects** - Smooth transitions on all interactive elements

### Priority 3 - Content Hierarchy
9. **Reorder tool page** - Video → Key Highlights → About → Pros/Cons → Analysis
10. **Compact rank cards** - Show pros/cons by default on /best pages
11. **Comparison matrix** - Table view for compare pages
12. **Related tools section** - Add "Similar tools" to tool pages

---

## 📊 Metrics to Track

After implementing improvements:
- **Bounce rate** - Should decrease on tool pages
- **Time on page** - Should increase (better engagement)
- **CTA click rate** - Should increase (better visibility)
- **Mobile engagement** - Should increase significantly

---

## 🛠️ Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create shared component library (`/src/components/ui/`)
- [ ] Standardize spacing scale
- [ ] Update color palette
- [ ] Add utility classes for common patterns

### Phase 2: Tool Page (Week 2)
- [ ] Redesign hero section
- [ ] Reorder content sections
- [ ] Add sticky sidebar
- [ ] Improve pros/cons visibility
- [ ] Add related tools section

### Phase 3: Best Lists (Week 3)
- [ ] Compact rank cards
- [ ] Show pros/cons by default
- [ ] Add comparison mode for top picks
- [ ] Improve mobile layout

### Phase 4: Compare Pages (Week 4)
- [ ] Add comparison matrix
- [ ] Improve visual differentiation
- [ ] Add quick verdict section
- [ ] Mobile swipeable cards

### Phase 5: Polish (Week 5)
- [ ] Add loading states
- [ ] Improve transitions
- [ ] Mobile optimization pass
- [ ] A/B test CTAs

---

## 📝 Notes

- All designs should maintain accessibility (WCAG AA minimum)
- Test on real devices, not just dev tools
- Consider adding dark mode toggle (optional)
- Keep SEO in mind (structured data, semantic HTML)
