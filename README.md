# StackHunt

A programmatic SEO platform for discovering software alternatives. Features an AI-powered "Hunter Agent" that autonomously researches tools, analyzes reviews, and publishes structured comparison pages.

## Tech Stack

- **Frontend**: Astro v5 + React (Islands) + Tailwind CSS
- **Database**: Supabase (Postgres) + pgvector for semantic search
- **Automation**: Node.js + TypeScript + Google Gemini 2.0 Flash + Serper.dev
- **Security**: Cloudflare Turnstile (invisible captcha)
- **Hosting**: Vercel

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        StackHunt                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Hunter     │───▶│   Supabase   │◀───│   Astro      │      │
│  │   Agent      │    │   (Postgres) │    │   Frontend   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Serper.dev │    │   pgvector   │    │   Vercel     │      │
│  │   (Search)   │    │   (Semantic) │    │   (Hosting)  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │   Gemini     │                                               │
│  │   2.0 Flash  │                                               │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

See [`docs/index.md`](docs/index.md) for the full documentation index and [`PRODUCT_SUMMARY.md`](PRODUCT_SUMMARY.md) for the complete architecture.

## Data Model (Hub & Spoke)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   TOOLS     │◀───────▶│   REVIEWS   │◀───────▶│  CONTEXTS   │
│   (Hub)     │         │  (Bridge)   │         │  (Spoke)    │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │
       │                       │ Contextual scores,
       │                       │ pros/cons per audience
       ▼                       │
┌─────────────┐                │
│ CATEGORIES  │                │
└─────────────┘                │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  AFFILIATE  │         │   VOTES     │
│   OFFERS    │         │   (User)    │
└─────────────┘         └─────────────┘
```

## Quick Start

### 1. Clone and Install

```bash
cd stackhunt
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration:

```bash
# Copy contents of supabase/migrations/001_foundation.sql
# Paste into Supabase SQL Editor and run
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in your keys:

```env
# Supabase (from Project Settings → API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Gemini (from aistudio.google.com/apikey)
GEMINI_API_KEY=...

# Serper.dev (from serper.dev)
SERPER_API_KEY=...

# Brandfetch (from brandfetch.com/api - free, no attribution required)
PUBLIC_BRANDFETCH_CLIENT_ID=...

# Cloudflare Turnstile (from dash.cloudflare.com)
PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...

# Site URL
PUBLIC_SITE_URL=http://localhost:4321
```

### 4. Run the Hunter Agent

```bash
# Research a single tool
npm run hunt -- --tool="Salesforce"

# Research with context (creates a comparison list)
npm run hunt -- --tool="Slack" --context="Best for Remote Teams"

# With category
npm run hunt -- --tool="Notion" --context="Best Note Apps" --category="productivity"
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:4321`

## Project Structure

```
stackhunt/
├── src/
│   ├── components/       # Astro & React components
│   │   ├── ToolCard.astro
│   │   ├── ScoreBadge.astro
│   │   ├── ProsCons.astro
│   │   ├── VoteWidget.tsx    # React island
│   │   └── ...
│   ├── layouts/
│   │   └── BaseLayout.astro  # Main layout with SEO
│   ├── lib/
│   │   ├── supabase.ts       # Database client & queries
│   │   ├── seo.ts            # JSON-LD schema generators
│   │   └── utils.ts          # Helper functions
│   ├── pages/
│   │   ├── index.astro       # Homepage
│   │   ├── tools/
│   │   │   ├── index.astro   # Tool listing
│   │   │   └── [slug].astro  # Tool detail (Hub)
│   │   ├── best/
│   │   │   ├── index.astro   # List index
│   │   │   └── [slug].astro  # Comparison list (Spoke)
│   │   ├── categories/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   └── api/
│   │       └── vote.ts       # Voting endpoint
│   └── types/
│       └── database.ts       # TypeScript interfaces
├── scripts/
│   └── hunter.ts             # Hunter Agent
├── supabase/
│   └── migrations/
│       └── 001_foundation.sql
└── ...config files
```

## Pages & SEO

| Page            | URL Pattern          | JSON-LD Schema        |
| --------------- | -------------------- | --------------------- |
| Homepage        | `/`                  | WebSite, Organization |
| Tool Detail     | `/tools/[slug]`      | SoftwareApplication   |
| Comparison List | `/best/[slug]`       | ItemList              |
| Category        | `/categories/[slug]` | BreadcrumbList        |

## Content Pipeline

StackHunt uses a **draft → review → publish** workflow for quality control:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   QUEUE     │────▶│   HUNTER    │────▶│   DRAFT     │────▶│  PUBLISHED  │
│ (scheduled) │     │   (AI gen)  │     │  (review)   │     │   (live)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                                        │
      │                                        ▼
      │                                 ┌─────────────┐
      └─────────────────────────────────│   REJECTED  │
           (retry failed items)         └─────────────┘
```

### Automated Flow

1. **Add to Queue**: Tools are added via CLI, admin dashboard, or programmatically
2. **Vercel Cron**: Runs daily at 6 AM, processes pending queue items
3. **Draft Creation**: Hunter generates content, saves as `status: 'draft'`
4. **Human Review**: Admin reviews at `/admin/review`
5. **Publish/Reject**: One-click approval or rejection

### CLI Commands

```bash
# Direct hunt (creates draft by default)
npm run hunt -- --tool="Salesforce"

# Publish immediately (skip review)
npm run hunt -- --tool="Slack" --publish

# Add to queue for later
npm run hunt -- --queue add --tool="HubSpot" --priority 10

# Check queue status
npm run hunt -- --queue status

# Process next queued item
npm run hunt -- --queue process
```

### Admin Dashboard

- `/admin` - Overview dashboard
- `/admin/review` - Draft review queue
- `/admin/review/[id]` - Edit & publish individual drafts
- `/admin/queue` - Manage content queue

## Hunter Agent Workflow

```
1. SCOUT (Serper.dev)
   ├── Search "[Tool] reviews"
   ├── Search "[Tool] pricing features"
   └── Search "[Tool] alternatives"

2. SYNTHESIZE (Google Gemini 2.0 Flash)
   ├── Analyze search snippets
   ├── Generate contextual score (0-100)
   ├── Extract 3 pros, 3 cons
   ├── Write markdown summary
   └── Tag sentiment (easy-to-use, expensive, etc.)

3. EMBED (Gemini embedding model)
   └── Generate vector embeddings for semantic search

4. LOGO
   ├── Extract domain from website URL
   └── Save domain only (hotlinked via Brandfetch CDN on frontend)

5. SAVE (Supabase)
   ├── Upsert tool record
   ├── Check for similar contexts (fuzzy dedup)
   ├── Create review (status: draft or published)
   └── Add default affiliate offer
```

## Voting System

Anti-gaming measures:

- **IP Hashing**: Privacy-preserving duplicate detection
- **Browser Fingerprint**: Additional spam prevention
- **Cloudflare Turnstile**: Invisible captcha
- **Shadowban**: Silent acceptance of duplicate votes

## Deployment

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### GitHub Actions (Hunter Cron)

Create `.github/workflows/hunter.yml`:

```yaml
name: Hunter Agent
on:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM
  workflow_dispatch:

jobs:
  hunt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run hunt -- --tool="${{ github.event.inputs.tool }}"
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          SERPER_API_KEY: ${{ secrets.SERPER_API_KEY }}
```

## API Costs (Estimated)

Per tool hunted:

- Serper.dev: ~$0.001 (3 searches)
- Google Gemini 2.0 Flash: variable by prompt and output size
- Gemini embeddings: variable by indexed content volume

Use runtime logs and provider dashboards for current cost tracking.

## Next Steps (Phase 4: Semantic Search)

1. Implement `/api/search.ts` endpoint
2. Create `match_tools` RPC for vector similarity
3. Add CMD+K search modal
4. Index existing tools with embeddings

## License

MIT
