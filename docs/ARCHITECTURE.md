# StackHunt Hunter Architecture

## Overview

The Hunter is StackHunt's AI-powered research and review generation system. It orchestrates a 3-phase pipeline to research tools, generate contextual reviews, and publish them with full legal protection.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│  (Thin coordinator - 400 lines)                         │
│  • Initializes services                                  │
│  • Creates HunterContext                                │
│  • Executes phases with early exits                     │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   PHASE 1    │  │   PHASE 2    │  │   PHASE 3    │
│   RESEARCH   │──│   ANALYSIS   │──│ PERSISTENCE  │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ Scout        │  │ Synthesize   │  │ Dedup Context│
│ Extract Facts│  │ Embed Vector │  │ Save Tool    │
│ Check Dups   │  │ Fetch Logo   │  │ Link Graph   │
└──────────────┘  └──────────────┘  │ Create Review│
       │                               └──────────────┘
       │ isDuplicate?
       └──── Early Exit ($40-60/month savings)

## Module Structure

```
src/lib/hunter/
├── index.ts              # Public API - re-exports everything
├── types.ts              # TypeScript interfaces & Zod schemas
├── constants.ts          # Fallback prompts & configuration
├── utils.ts              # Pure utility functions (tested)
├── orchestrator.ts       # Main Hunter class
├── services/
│   ├── serper.ts         # Google Search API wrapper
│   ├── gemini.ts         # Gemini AI wrapper (extraction + synthesis)
│   ├── logo.ts           # Logo fetching + upload
│   └── queue.ts          # Hunt queue with heartbeat monitoring
└── phases/
    ├── research.ts       # Phase 1: Scout + Extract + Dedup check
    ├── analysis.ts       # Phase 2: Synthesize + Embed + Logo
    └── persistence.ts    # Phase 3: Save + Graph + Auto-publish
```

## Core Concepts

### HunterContext

The context object flows through all phases, accumulating data and enabling early exits:

```typescript
interface HunterContext {
  toolName: string;
  contextTitle?: string;

  // Early exit flags (cost optimization)
  skipAnalysis?: boolean;      // Set if duplicate found
  skipPersistence?: boolean;   // Set if validation fails

  // Accumulated data from each phase
  research?: ResearchOutput;
  analysis?: AnalysisOutput;

  // Metadata
  tokensUsed: number;
  logs: string[];
}
```

### Dependency Injection

All phases receive a `HunterDependencies` object for easy testing and mocking:

```typescript
interface HunterDependencies {
  supabase: SupabaseClient;
  serper: SerperService;
  gemini: GeminiService;
  logo: LogoService;
  config: HunterConfig;
  withRetry: <T>(fn: () => Promise<T>) => Promise<T>;
  log: (message: string) => void;
}
```

### Two-Pass Architecture (Librarian + Architect)

**Pass 1 - The Librarian** (temp=0.1):
- Extract structured facts only
- Low temperature for accuracy
- Builds KnowledgeCard with 8 sections

**Pass 2 - The Architect** (temp=0.3):
- Synthesize contextual review
- Uses verified facts from Pass 1
- Higher temperature for nuanced analysis

## Legal Protection

### Source Attribution

Every claim (pro/con) includes:
- `source_url` - URL where claim was found
- `source_type` - "official", "editorial", "community"
- `claim_type` - "fact" or "opinion"
- `retrieved_at` - Timestamp for time-bound defense

### Negative Sentiment Guardrail

Opinions from community sources require **2+ independent sources** for corroboration:

```typescript
// BLOCKED: Single-source negative opinion
{
  text: "Expensive for small businesses",
  source_url: "https://reddit.com/...",
  source_type: "community",
  claim_type: "opinion"
} // ❌ Filtered - needs 2+ sources

// ALLOWED: Multi-source negative opinion
{
  text: "Steep learning curve",
  source_url: "https://reddit.com/...",
  source_type: "community",
  claim_type: "opinion"
} // ✅ Corroborated by G2, TrustRadius
```

### Auto-Publish Criteria

Reviews auto-publish when:
- ✅ Data quality = "high"
- ✅ Score ≥ 70
- ✅ ≤1 filtered con
- ✅ ≥2 valid cons

Otherwise, saved as draft for manual review.

## Cost Optimization

### Early Exit on Duplicate Detection

```
WITHOUT early exit:
Scout ($0.01) → Extract ($0.02) → Synthesize ($0.03) → Embed ($0.01) = $0.07

WITH early exit:
Scout ($0.01) → Extract ($0.02) → Duplicate found → STOP = $0.03

Savings: $0.04 per duplicate × 1000/month = $40/month
```

### Token Usage Tracking

Every phase reports `tokensUsed` which accumulates in `HunterContext`:
- Typical new hunt: 3000-5000 tokens ($0.05-0.07)
- Duplicate early exit: 1500-2000 tokens ($0.02-0.03)

## Services

### SerperService

Wraps Google Search API with:
- `scout()` - 3 specialized queries (reviews, pricing, alternatives)
- `scoutForContext()` - Context discovery searches
- Source deduplication by URL

### GeminiService

Wraps Google AI with:
- `extractKnowledgeCard()` - Pass 1 fact extraction (temp=0.1)
- `synthesize()` - Pass 2 contextual review (temp=0.3)
- `generateEmbedding()` - Vector embeddings for semantic search

### LogoService

Fetches logos with fallback cascade:
1. Clearbit (highest quality)
2. Google Favicons (reliable)
3. DuckDuckGo (fallback)

Uploads to Supabase Storage at `logos/{slug}.{ext}`.

### QueueService

Manages hunt queue with:
- Atomic claiming (prevents race conditions)
- Heartbeat monitoring (30s intervals)
- Worker liveness detection
- Stale job cleanup

## Database Schema

### Tools
- `id` (uuid, PK)
- `name`, `slug`, `website`
- `logo_path`, `logo_url`
- `pricing_type` (enum)
- `embedding` (vector 768)
- `metadata` (jsonb) - stores KnowledgeCard

### Contexts
- `id` (uuid, PK)
- `title`, `slug`
- `title_template` ("best")
- `title_noun`, `title_modifier`
- Graph links: `function_category_id`, `audience_category_id`

### Reviews
- `id` (uuid, PK)
- `tool_id`, `context_id` (composite unique)
- `score` (0-100)
- `pros`, `cons` (jsonb arrays with source attribution)
- `summary_markdown`
- `sentiment_tags`
- `status` ("draft" | "published")
- `sources` (jsonb) - audit trail

### Knowledge Graph
- `categories` - Functions, Audiences, Platforms
- `tool_categories` - M:N linking table

## Performance

### Benchmarks

| Operation | Duration | Tokens | Cost |
|-----------|----------|--------|------|
| Full hunt (new tool) | 15-25s | 3000-5000 | $0.05-0.07 |
| Early exit (duplicate) | 5-10s | 1500-2000 | $0.02-0.03 |
| Queue processing | ~20s/tool | 3000-5000 | $0.05-0.07 |

### Scaling

- **Concurrent hunts**: Each hunt is independent, can run in parallel
- **Queue workers**: Multiple workers can claim jobs atomically
- **Rate limits**: Retry logic with exponential backoff
- **Cost control**: Early exits save $40-60/month at 1000 hunts/month

## Testing

### Unit Tests
- `tests/lib/hunter/utils.test.ts` - 20 tests, 100% coverage
- Pure functions tested in isolation

### Integration Tests (TODO)
- `tests/lib/hunter/phases/research.test.ts`
- `tests/lib/hunter/phases/analysis.test.ts`
- `tests/lib/hunter/phases/persistence.test.ts`

## Monitoring

### Logs

Every hunt produces structured logs:
```
[Hunter] Starting hunt for: QuickBooks
[Hunter] [Phase 1: Research] Starting
[Hunter] Scout completed: 15 sources found
[Hunter] [Pass 1] Knowledge Card extracted (quality: high)
[Hunter] [Phase 1] Complete - No duplicates found
[Hunter] [Phase 2: Analysis] Starting
[Hunter] [Pass 2] Analysis complete - Score: 88/100
[Hunter] [Guardrail] Filtered 1 negative claim(s)
[Hunter] [Auto-publish] High confidence review
[Hunter] ✅ Hunt complete: QuickBooks
```

### Metrics

Track in HunterResult:
- `tokensUsed` - Total tokens consumed
- `durationMs` - Wall-clock time
- `success` - Boolean outcome
- `error` - Error message if failed

## Error Handling

### Retry Logic

Services wrapped with exponential backoff:
```typescript
private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError;
}
```

### Failure Modes

1. **Scout fails**: Retry 3x, then fail hunt
2. **Gemini fails**: Retry 3x, then fail hunt
3. **Logo fails**: Log warning, continue without logo
4. **DB save fails**: Fail hunt, rollback not needed (idempotent upserts)

## Future Enhancements

### Potential Improvements

1. **Webhooks**: Real-time notifications when hunts complete
2. **Streaming**: SSE for live hunt progress
3. **Caching**: Redis for duplicate detection
4. **Batch optimization**: Process similar tools together
5. **Multi-model**: Use Claude for synthesis, Gemini for extraction

## Snapshot Compiler Trust Contract (2026-02-20.v1)

This contract governs deterministic `/best` and `/compare` compiler outputs.
It is deliberately separate from prompt behavior and must be versioned.

### 1) Freshness by Volatility Tier

- **Tier 1 (high volatility):** pricing, plan gating, hard limits
- **Tier 2 (medium volatility):** integrations, platform support, admin/security posture
- **Tier 3 (lower volatility):** core workflow capabilities, positioning metadata

Snapshot gating must evaluate freshness by tier, not a single timestamp.
Stale Tier 1 fields block publish or require explicit downgraded confidence/disputed state.

### 2) Evidence Tiers

- **Tier A:** official/docs/support/legal
- **Tier B:** editorial technical coverage
- **Tier C:** community/opinion signals

Critical fields must be backed by Tier A evidence. Tier C can inform subjective framing but cannot
be the sole basis for critical claims.

### 3) Conflict Semantics

Critical field disagreement is represented explicitly as `disputed`.
The compiler must not silently pick a winner for conflicts on pricing, plan gating, security/compliance,
or hard limits.

### 4) Count Semantics

Context/list metrics must keep separate meanings:

- `all_reviews_count`: all reviews linked to a context
- `published_reviews_count`: public-safe published reviews
- `snapshot_ranked_count`: entries present in the active published snapshot

Do not overload a single `tool_count` for all three meanings.

### Metrics to Add

- Average data quality by source domain
- Auto-publish rate (% of reviews that skip manual review)
- Duplicate detection rate
- Cost per published review
