# StackHunt Product Summary

**Last Updated:** January 21, 2026

## Overview

StackHunt is an AI-powered software review platform that automatically researches, analyzes, and generates contextual tool reviews. The platform targets SEO-rich "best X for Y" queries with data-driven content.

## Core Value Proposition

1. **Automated Content Generation** - Hunter agent researches tools and generates reviews
2. **Contextual Reviews** - Tools reviewed in specific use-case contexts (e.g., "Best CRM for Startups")
3. **Strategy Gatekeeper** - Data-driven keyword selection from Ahrefs/SEMrush CSV imports
4. **Knowledge Graph** - Multi-dimensional categorization (Function + Audience + Platform)

---

## Architecture

### Tech Stack
- **Frontend**: Astro + React (TypeScript) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Google Gemini 2.0 Flash (analysis) + Serper API (search)
- **Hosting**: Vercel (serverless)
- **CLI**: Node.js hunter script for batch processing

### Directory Structure
```
src/
├── components/          # React/Astro UI components
├── layouts/             # BaseLayout, AdminLayout
├── lib/
│   ├── hunter/          # Modular hunter system (services, phases)
│   ├── hunter.ts        # Legacy hunter entry point
│   ├── knowledge-card.ts # Knowledge Card extraction
│   └── supabase.ts      # Database client
├── pages/
│   ├── admin/           # Admin dashboard (strategy, review, create, queue)
│   ├── api/             # REST endpoints
│   ├── best/            # Context pages (/best/[slug])
│   ├── tools/           # Tool pages (/tools/[slug])
│   ├── categories/      # Category pages
│   └── compare/         # Comparison pages
└── types/               # TypeScript definitions

scripts/
└── hunter.ts            # CLI for batch hunting and strategy operations

supabase/
└── migrations/          # 12 SQL migrations
```

---

## Database Schema (22 Tables)

### Core Content
| Table | Rows | Purpose |
|-------|------|---------|
| `tools` | 4 | Software tools with metadata, Knowledge Card |
| `contexts` | 4 | Use-case contexts ("Best X for Y") |
| `reviews` | 4 | Tool reviews within contexts |
| `categories` | 0 | Taxonomy (function/audience/platform) |
| `tool_category_links` | 33 | Many-to-many tool-category |

### Hunt Queue System
| Table | Rows | Purpose |
|-------|------|---------|
| `hunt_queue` | 10 | Pending hunts with priority, status, worker tracking |
| `content_ideas` | 10 | Strategy gatekeeper staging area (pre-hunt) |
| `import_batches` | 1 | CSV import batch tracking |

### Keyword Intelligence
| Table | Rows | Purpose |
|-------|------|---------|
| `system_settings` | 2 | Configurable thresholds and weights |
| `keyword_performance` | 0 | Track rankings over time (GSC/Ahrefs) |
| `competitors` | 0 | Competitor domains |
| `competitor_pages` | 0 | Competitor top pages for gap analysis |

### Monetization (Future)
| Table | Rows | Purpose |
|-------|------|---------|
| `affiliate_offers` | 0 | Affiliate links with priority |
| `click_events` | 0 | Click tracking with attribution |
| `market_state` | 0 | Current pricing state |
| `price_history` | 0 | Price changes over time |

### User Feedback
| Table | Rows | Purpose |
|-------|------|---------|
| `votes` | 0 | Review upvotes/downvotes |
| `corrections` | 0 | User-submitted corrections |

### Admin
| Table | Rows | Purpose |
|-------|------|---------|
| `admin_sessions` | 1 | Session tokens |
| `admin_users` | 0 | Admin accounts |
| `rate_limits` | 0 | API rate limiting |

### Prompts (Optional)
| Table | Rows | Purpose |
|-------|------|---------|
| `prompts` | 0 | Editable prompts (fallbacks in code) |
| `prompt_versions` | 0 | Version history |

---

## Key Workflows

### 1. Strategy Gatekeeper Pipeline
```
Ahrefs CSV → Import → Filter (volume/difficulty/CPC) → AI Classify → Approve → Hunt Queue
```

**CLI Commands:**
```bash
npx tsx scripts/hunter.ts --strategy import keywords.csv    # Import keywords
npx tsx scripts/hunter.ts --strategy analyze               # Calculate ROI scores
npx tsx scripts/hunter.ts --strategy classify              # AI classify keyword types
npx tsx scripts/hunter.ts --strategy competitors data.csv  # Import competitor pages
npx tsx scripts/hunter.ts --strategy gaps                  # Show keyword gaps
```

**Keyword Types:**
- `best_list` - "best crm software" (1.5x multiplier)
- `comparison` - "notion vs obsidian" (1.3x)
- `alternatives` - "figma alternatives" (1.2x)
- `single_tool` - "figma pricing" (1.0x)
- `informational` - "how to use figma" (skip)

**ROI Formula:**
```
(Volume × CPC_weight) / (Difficulty + 10) × Type_multiplier
```

### 2. Hunter Pipeline
```
Hunt Queue → Claim → Research (Serper) → Analyze (Gemini) → Persist → Complete
```

**Phases:**
1. **Research Phase** - 3 parallel Serper searches (reviews, pricing, alternatives)
2. **Analysis Phase** - Two-pass Gemini analysis:
   - Pass 1: Knowledge Card extraction (structured facts)
   - Pass 2: Full synthesis (score, pros, cons, summary)
3. **Persistence Phase** - Create/update tool, context, review, categories

**CLI Commands:**
```bash
npx tsx scripts/hunter.ts "Notion"                    # Single tool
npx tsx scripts/hunter.ts --context "for Startups"   # With context
npx tsx scripts/hunter.ts --process-queue            # Process hunt queue
```

### 3. Review Workflow
```
Hunt → Draft Review → Admin Review → Publish
```

**Admin Pages:**
- `/admin/strategy` - Import keywords, approve hunts
- `/admin/create` - Single hunt, queue management
- `/admin/review` - Review drafts, inline editing
- `/admin/queue` - View/manage hunt queue

---

## Public Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage with featured contexts |
| `/best/[slug]` | Context page (e.g., /best/crm-for-startups) |
| `/tools/[slug]` | Tool detail page |
| `/tools` | All tools listing |
| `/categories/[slug]` | Category page |
| `/categories` | All categories |
| `/compare/[...slugs]` | Tool comparison |
| `/go/[slug]` | Affiliate redirect |

---

## Key Files

### Hunter System
- `src/lib/hunter/orchestrator.ts` - Main orchestration
- `src/lib/hunter/phases/research.ts` - Serper searches
- `src/lib/hunter/phases/analysis.ts` - Gemini AI analysis
- `src/lib/hunter/phases/persistence.ts` - Database writes
- `src/lib/hunter/services/gemini.ts` - AI client
- `src/lib/hunter/services/logo.ts` - Logo fetching with fallbacks
- `src/lib/hunter/constants.ts` - Fallback prompts

### Strategy System
- `scripts/hunter.ts` - CLI with strategy operations
- `supabase/migrations/010_strategic_architecture.sql` - Queue system
- `supabase/migrations/012_keyword_intelligence.sql` - Keyword system

### Type Definitions
- `src/types/database.ts` - All database types

---

## Environment Variables

```bash
# Supabase
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI/Search
GEMINI_API_KEY=
SERPER_API_KEY=

# Admin
ADMIN_SECRET=

# Optional
REPLICATE_API_TOKEN=  # OG image generation
```

---

## Current Status

**Working:**
- Hunter pipeline (single tool, context, queue processing)
- Knowledge Card extraction
- Strategy gatekeeper (CSV import, filtering, ROI scoring)
- Admin dashboard (strategy, review, queue)
- Public pages (best, tools, categories)

**Ready for Future:**
- Affiliate tracking (tables exist)
- Price monitoring (tables exist)
- User voting/corrections (tables exist)
- Keyword performance tracking (tables exist)
- Competitor gap analysis (tables exist)

---

## Migration History

1. `001_foundation.sql` - Core tables (tools, contexts, reviews, categories)
2. `002_affiliate_audit_view.sql` - Affiliate offer views
3. `003_content_pipeline.sql` - Initial queue system
4. `004_knowledge_graph.sql` - Multi-dimensional categories
5. `005_prompts.sql` - Editable prompts
6. `006_review_sources.sql` - Source tracking
7. `007_security.sql` - Admin sessions, rate limiting
8. `008_editorial_brain.sql` - Editorial guidelines
9. `009_og_images.sql` - OG image generation
10. `010_strategic_architecture.sql` - Hunt queue, market state, click tracking
11. `011_intelligence_engine.sql` - Content ideas, import batches
12. `012_keyword_intelligence.sql` - Ahrefs data, keyword types, performance tracking
13. `014_cleanup_deprecated_tables.sql` - Removed content_queue, hunt_logs (superseded)
