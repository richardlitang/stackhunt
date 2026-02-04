# Image Carousel Integration Guide

## Overview

The `ToolImageCarousel` component is ready to display product screenshots. This addresses the critical "I can't see the product" trust issue.

## Component Location

`src/components/ToolImageCarousel.astro`

## Integration Points

### 1. Tool Page (`src/pages/tool/[slug].astro`)

**Where to add:** After the header section, before pricing details.

```astro
import ToolImageCarousel from '@/components/ToolImageCarousel.astro';

<!-- Add after logo/header, around line 350-400 -->
{toolScreenshots && (
  <ToolImageCarousel
    toolName={tool.name}
    screenshots={toolScreenshots}
  />
)}
```

### 2. Data Structure

Add to `items.specs.screenshots` (JSONB):

```json
{
  "screenshots": [
    {
      "url": "https://cdn.stackhunt.com/airtable-grid.jpg",
      "caption": "Grid View - The core spreadsheet interface",
      "alt": "Airtable grid view showing spreadsheet with colored columns"
    },
    {
      "url": "https://cdn.stackhunt.com/airtable-kanban.jpg",
      "caption": "Kanban Board - Drag-and-drop task management",
      "alt": "Airtable kanban board with cards organized in columns"
    },
    {
      "url": "https://cdn.stackhunt.com/airtable-automation.jpg",
      "caption": "Automation Builder - Visual workflow editor",
      "alt": "Airtable automation interface showing trigger-action flow"
    }
  ]
}
```

### 3. Schema Addition

Add to `src/types/database.ts`:

```typescript
interface ToolSpecs {
  // ... existing fields
  screenshots?: Array<{
    url: string;
    caption: string;
    alt: string;
  }>;
}
```

## Image Sourcing Strategies

### Option A: Google Custom Search API
```bash
npm run scrape:screenshots -- --tool="Airtable"
```

Query pattern:
```
site:airtable.com OR site:youtube.com intitle:"interface" OR intitle:"demo" filetype:jpg OR filetype:png
```

### Option B: Manual Curation
1. Visit tool's marketing site
2. Check `/features`, `/tour`, `/demo` pages
3. Download 3 hero images (grid, feature, settings)
4. Upload to CDN
5. Add URLs to database

### Option C: Tool-Specific APIs
Some tools provide official screenshots via API:
- ProductHunt API
- Capterra/G2 APIs
- Official press kits

## Priority Tools to Screenshot

Based on traffic/value:

1. **Databases:** Airtable, Notion, Coda
2. **Communication:** Slack, Discord, Zoom
3. **CRM:** HubSpot, Salesforce, Pipedrive
4. **Project Management:** Monday, Asana, ClickUp
5. **Development:** GitHub, GitLab, Jira

## ETL Pattern (When Ready)

```typescript
// scripts/extract-screenshots.ts
async function extractScreenshots(toolId: string, toolName: string) {
  // 1. Fetch from Google Custom Search
  const images = await googleImageSearch(toolName + " interface screenshot");

  // 2. Filter for quality (min 1200px width, aspect ratio 16:9 or 4:3)
  const filtered = images.filter(img =>
    img.width >= 1200 &&
    img.height >= 600 &&
    !img.url.includes('logo')
  );

  // 3. Upload to CDN (Cloudflare Images / S3)
  const uploaded = await uploadToCDN(filtered[0..2]);

  // 4. Update database
  await supabase
    .from('items')
    .update({
      specs: {
        ...existing,
        screenshots: uploaded.map(u => ({
          url: u.cdn_url,
          caption: generateCaption(u),
          alt: generateAlt(toolName, u)
        }))
      }
    })
    .eq('id', toolId);
}
```

## Why This Matters (From Roast)

> "I am reading a review about a visual database tool, and I see zero pictures of the database. I see logos. I see icons. I see text. I see your branding. But I have to open a new tab and Google 'Airtable screenshots' to see if the interface is ugly. **You have failed your primary job as an aggregator: Saving me clicks.**"

**Impact:** This is the #1 differentiator between a scraper site and a research tool. Users are visual. They need to see if the UI looks dated or modern. Text like "user-friendly interface" is meaningless without proof.

## Next Steps

1. Decide on sourcing strategy (API vs manual vs scraping)
2. Set up CDN for image hosting
3. Create screenshot extraction script
4. Start with top 20 tools by traffic
5. Monitor engagement metrics (time on page, bounce rate)
