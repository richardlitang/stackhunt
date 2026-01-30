# StackHunt SEO Architecture

Technical SEO guide for programmatic content. Focus: Information Gain, Anti-Thin Content, Schema Markup.

---

## Core Philosophy: Information Gain

Google penalizes "Consensus Content" (summarizing what others say). Every page must contain **proprietary data** that competitors lack.

| Page Type | Our Information Gain Source |
|-----------|----------------------------|
| `/tool/*` | Knowledge Card (specs, pricing, integrations from `metadata` JSONB) |
| `/best/*` | Contextual reviews with fit scores, sentiment tags, standout features |
| `/compare/*` | Computed diffs + curated `comparison_insights` (verdicts, choose_if) |

---

## 1. URL Structure

### Current State: Mostly Correct

```
/tool/[slug]      ✅ Singular (correct)
/best/[slug]      ✅ Context pages
/compare/[slugs]  ✅ Comparison pages
/categories/      ⚠️ Index only - needs /categories/[slug] detail pages
```

### Required Fix: Category Detail Pages

```astro
// NEW FILE: src/pages/categories/[slug].astro
// Shows all tools + contexts in a category
// Enables: /categories/project-management, /categories/developer-tools
```

### Trailing Slash Config

Already handled - Astro defaults to no trailing slashes. No change needed.

---

## 2. Canonicalization

### Tool Pages: ✅ Done
`BaseLayout.astro` sets canonical via `meta.canonical` prop.

### Comparison Pages: ⚠️ Needs Alphabetical Enforcement

**Problem**: `/compare/notion-vs-linear` and `/compare/linear-vs-notion` create duplicates.

**Solution**: Already partially handled - slugs are sorted in the page. Add server-side redirect.

```typescript
// In src/pages/compare/[...slugs].astro - getStaticPaths()
// Current: Generates all permutations
// Needed: Only generate alphabetically-sorted version, redirect others
```

**Implementation**:
```astro
---
// At top of compare page
const sortedSlugs = [...slugs].sort();
const canonicalPath = `/compare/${sortedSlugs.join('-vs-')}`;

// If URL doesn't match sorted version, redirect
if (Astro.url.pathname !== canonicalPath) {
  return Astro.redirect(canonicalPath, 301);
}
---
```

---

## 3. Schema Markup

### Current Implementation: `src/lib/seo.ts`

| Schema | Status | Used On |
|--------|--------|---------|
| `SoftwareApplication` | ✅ | `/tool/*` |
| `AggregateRating` | ✅ | `/tool/*` (embedded) |
| `BreadcrumbList` | ✅ | All pages |
| `ItemList` | ✅ | `/best/*` |
| `FAQPage` | ✅ | `/compare/*` |
| `Organization` | ✅ | Site-wide |
| `WebSite` + SearchAction | ✅ | Site-wide |
| `Review` | ⚠️ Defined but unused | - |
| `Product` | ❌ Missing | Hardware/gear pages if added |
| `VideoObject` | ❌ Missing | Tools with video_id |

### Enhancement: Video Schema

```typescript
// Add to src/lib/seo.ts
export function generateVideoSchema(tool: Tool) {
  if (!tool.video_id) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: `${tool.name} Demo`,
    description: tool.tagline,
    thumbnailUrl: `https://img.youtube.com/vi/${tool.video_id}/maxresdefault.jpg`,
    uploadDate: tool.created_at,
    embedUrl: `https://www.youtube.com/embed/${tool.video_id}`,
    publisher: {
      '@type': 'Organization',
      name: 'StackHunt',
      logo: { '@type': 'ImageObject', url: 'https://stackhunt.io/logo.png' }
    }
  };
}
```

### Enhancement: Specs/Features Schema

```typescript
// Add structured specs to SoftwareApplication
export function generateToolSchema(tool: Tool) {
  const knowledgeCard = tool.metadata as KnowledgeCard;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    applicationCategory: tool.category?.name || 'BusinessApplication',
    operatingSystem: knowledgeCard?.platforms?.join(', ') || 'Web',

    // Pricing
    offers: knowledgeCard?.pricing ? {
      '@type': 'Offer',
      price: extractPrice(knowledgeCard.pricing.starting_price),
      priceCurrency: 'USD',
      priceSpecification: knowledgeCard.pricing.has_free_tier ? {
        '@type': 'UnitPriceSpecification',
        price: 0,
        priceCurrency: 'USD',
        name: 'Free Tier'
      } : undefined
    } : undefined,

    // Rating
    aggregateRating: tool.avg_score ? {
      '@type': 'AggregateRating',
      ratingValue: (tool.avg_score / 20).toFixed(1), // Convert 0-100 to 0-5
      bestRating: 5,
      worstRating: 1,
      ratingCount: tool.review_count || 1
    } : undefined,

    // Features (for rich snippets)
    featureList: knowledgeCard?.key_features?.slice(0, 5)
  };
}
```

---

## 4. Anti-Thin Content Strategy

### A. Specs Grid (Tool Pages)

**Current**: Knowledge Card data exists in `metadata` JSONB but not rendered.

**Required Component**: `SpecsGrid.astro`

```astro
---
// src/components/SpecsGrid.astro
import type { KnowledgeCard } from '../lib/knowledge-card';

interface Props {
  specs: KnowledgeCard;
}

const { specs } = Astro.props;

// Only render rows with data
const sections = [
  { label: 'Platforms', value: specs.platforms?.join(', ') },
  { label: 'Pricing', value: specs.pricing?.model },
  { label: 'Starting Price', value: specs.pricing?.starting_price },
  { label: 'Free Tier', value: specs.pricing?.has_free_tier ? 'Yes' : 'No' },
  { label: 'Integrations', value: specs.integrations?.slice(0, 10).join(', ') },
  { label: 'Founded', value: specs.company?.founded },
  { label: 'Headquarters', value: specs.company?.headquarters },
].filter(s => s.value);
---

{sections.length > 0 && (
  <dl class="grid grid-cols-2 gap-4 text-sm">
    {sections.map(({ label, value }) => (
      <div>
        <dt class="text-zinc-500">{label}</dt>
        <dd class="font-medium">{value}</dd>
      </div>
    ))}
  </dl>
)}
```

**Usage in `/tool/[slug].astro`**:
```astro
<SpecsGrid specs={tool.metadata as KnowledgeCard} />
```

### B. Computed Comparison (Compare Pages)

**Current**: `SmartComparisonTable` exists but basic.

**Enhancement**: Add visual diff highlighting.

```tsx
// In SmartComparisonTable.tsx
// Add green/red indicators for differences
const DiffCell = ({ a, b, feature }) => {
  const hasA = a.specs?.[feature];
  const hasB = b.specs?.[feature];

  if (hasA && !hasB) return <span class="text-green-600">✅ {a.name} only</span>;
  if (hasB && !hasA) return <span class="text-red-600">❌ Missing</span>;
  return <span class="text-zinc-400">Both have</span>;
};
```

### C. Freshness Signal

**Current**: `published_at` exists but not displayed.

**Required Component**: `FreshnessIndicator.astro`

```astro
---
// src/components/FreshnessIndicator.astro
interface Props {
  lastChecked: Date;
  pricingChanged?: boolean;
}

const { lastChecked, pricingChanged } = Astro.props;
const formatted = lastChecked.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
---

<div class="text-xs text-zinc-500 flex items-center gap-2">
  <span>Last verified: {formatted}</span>
  {pricingChanged && <span class="text-amber-600">Pricing updated</span>}
</div>
```

---

## 5. Internal Linking Strategy

### Current State

| Strategy | Status |
|----------|--------|
| Similar Tools (`/tool/*`) | ✅ Implemented |
| Related Links (`/compare/*`) | ✅ Implemented |
| Breadcrumbs | ✅ All pages |
| Category → Tools | ⚠️ Index only |
| Context → Related Contexts | ⚠️ Basic |

### Required: Semantic Sibling Clusters

```sql
-- Query for related tools (same category, similar score)
SELECT * FROM tools
WHERE category_id = $current_category_id
  AND id != $current_tool_id
  AND avg_score BETWEEN $current_score - 15 AND $current_score + 15
ORDER BY avg_score DESC
LIMIT 6;
```

**Link Text Guidelines**:
- ❌ "Obsidian"
- ✅ "See how Notion compares to Obsidian"
- ✅ "Obsidian - Best for local-first note-taking"

### Required: Category Detail Pages

Missing `/categories/[slug].astro` creates orphan pages. Implementation:

```astro
---
// src/pages/categories/[slug].astro
export const prerender = true;

export async function getStaticPaths() {
  const categories = await supabase.from('categories').select('slug, name');
  return categories.data.map(c => ({ params: { slug: c.slug }, props: { category: c } }));
}

const { category } = Astro.props;
const tools = await getToolsByCategory(category.id);
const contexts = await getContextsByCategory(category.id);
---

<BaseLayout>
  <Breadcrumb items={[
    { name: 'Categories', href: '/categories' },
    { name: category.name }
  ]} />

  <h1>{category.name} Tools</h1>

  <section>
    <h2>Top {category.name} Software</h2>
    <!-- Tool grid -->
  </section>

  <section>
    <h2>Best {category.name} For...</h2>
    <!-- Context list linking to /best/* pages -->
  </section>
</BaseLayout>
```

---

## 6. E-E-A-T Trust Signals

### Current State

| Signal | Status |
|--------|--------|
| Affiliate Disclosure | ✅ `AffiliateDisclosure.astro` |
| Human Review Gate | ✅ Draft → Published workflow |
| Source Attribution | ⚠️ Partial (reviews have sources in metadata) |
| Author/Auditor Display | ❌ Missing |

### Required: Human Audit Box

```astro
---
// src/components/AuditBadge.astro
interface Props {
  reviewedBy?: string;
  reviewedAt?: Date;
}
---

<aside class="text-xs text-zinc-500 border-l-2 border-zinc-200 pl-3">
  <p>Data verified by StackHunt Editorial</p>
  {Astro.props.reviewedAt && (
    <p>Last reviewed: {Astro.props.reviewedAt.toLocaleDateString()}</p>
  )}
</aside>
```

### Required: Source Citations

When rendering pros/cons from reviews:

```astro
{review.sources?.map(source => (
  <sup>
    <a href={source.url} rel="nofollow" class="text-blue-600">
      [{source.label}]
    </a>
  </sup>
))}
```

---

## 7. Crawl Budget Management

### robots.txt: ✅ Correct

```
User-agent: *
Allow: /tool/
Allow: /best/
Allow: /compare/
Allow: /categories/
Disallow: /go/
Disallow: /admin/
Disallow: /api/

Sitemap: https://stackhunt.io/sitemap-index.xml
```

### Low-Quality Pruning

**Rule**: If `metadata` is empty AND `avg_score` is null, noindex.

```astro
---
// In tool page
const shouldNoindex = !tool.metadata && !tool.avg_score;
---

<head>
  {shouldNoindex && <meta name="robots" content="noindex, follow" />}
</head>
```

### Sitemap Chunking

Current: Single auto-generated sitemap.

**Enhancement** (optional for scale):
```javascript
// astro.config.mjs
sitemap({
  customPages: [
    'https://stackhunt.io/sitemap-tools.xml',
    'https://stackhunt.io/sitemap-contexts.xml',
    'https://stackhunt.io/sitemap-comparisons.xml',
  ],
})
```

---

## 8. Performance (Core Web Vitals)

### Image Optimization: ✅ Done
Using Astro's `<Image />` component via `@astrojs/vercel` image service.

### Video Facades: ⚠️ Needed

**Current**: Raw YouTube iframes may exist.

**Required**: Implement lazy-loading video facade.

```tsx
// src/components/VideoEmbed.tsx (React island)
import LiteYouTubeEmbed from 'react-lite-youtube-embed';

export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <LiteYouTubeEmbed
      id={videoId}
      title={title}
      poster="maxresdefault"
      noCookie={true}
    />
  );
}
```

### Font Loading: ⚠️ Check

Ensure Google Fonts use `display=swap`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

---

## 9. Implementation Priority

### Phase 1: Invisible Fixes (High SEO Impact, Low Effort)

1. **Comparison canonical enforcement** - Add alphabetical redirect in `/compare/*`
2. **Video schema** - Add `generateVideoSchema()` to seo.ts
3. **noindex thin content** - Add meta robots for empty tools
4. **Font display swap** - Verify in BaseLayout

### Phase 2: Content Enhancements (Medium Effort)

5. **SpecsGrid component** - Render Knowledge Card data
6. **FreshnessIndicator** - Show last verified date
7. **AuditBadge** - Human verification signal
8. **Source citations** - Link to original sources

### Phase 3: Structural (Higher Effort)

9. **Category detail pages** - `/categories/[slug].astro`
10. **Enhanced comparison table** - Visual diff highlighting
11. **FAQ sections** - Add to context pages
12. **Video facade component** - Replace raw iframes

---

## Quick Reference: File Locations

| What | Where |
|------|-------|
| Schema functions | `src/lib/seo.ts` |
| Meta generation | `src/lib/seo.ts` |
| Base layout | `src/layouts/BaseLayout.astro` |
| Tool page | `src/pages/tool/[slug].astro` |
| Context page | `src/pages/best/[slug].astro` |
| Compare page | `src/pages/compare/[...slugs].astro` |
| Knowledge Card types | `src/lib/knowledge-card.ts` |
| Database types | `src/types/database.ts` |
| robots.txt | `public/robots.txt` |
| Astro config | `astro.config.mjs` |
