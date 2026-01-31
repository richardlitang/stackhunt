# Hunter Ingestion Layer: Extension Guide

The Hunter pipeline is a general-purpose **Research → Extraction → Persistence** system. While built for SaaS tool reviews, the architecture is reusable for any web research task.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      HUNTER PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT: { name, context?, category? }                          │
│                                                                 │
│  PHASE 1: RESEARCH (Serper + Jina Scraper)                     │
│    - 12 parallel search queries                                │
│    - Deep scrape identified pages                              │
│    - Output: SearchResult with categorized snippets            │
│                                                                 │
│  PHASE 2: ANALYSIS (Gemini)                                    │
│    Pass 1: Knowledge Card (structured facts)                   │
│    Pass 2: Synthesis (contextual analysis)                     │
│    - Vector embedding                                          │
│    - Logo/image fetch                                          │
│                                                                 │
│  PHASE 3: PERSISTENCE (Supabase)                               │
│    - Dedupe check                                              │
│    - Upsert entities                                           │
│    - Link relationships                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Abstractions

### 1. SerperService
**Location:** `src/lib/hunter/services/serper.ts`

General-purpose search with:
- Configurable query templates
- Source deduplication
- Deep page scraping via Jina.ai Reader

**Extension point:** The `scout()` method takes a `toolName` but could be generalized:
```typescript
interface ScoutConfig {
  subject: string;
  queryTemplates: string[];  // e.g., ["{subject} reviews", "{subject} pricing"]
  maxResultsPerQuery?: number;
  deepScrapePatterns?: RegExp[];  // URLs matching these get full page scrape
}

async scout(config: ScoutConfig): Promise<SearchResult>
```

### 2. GeminiService
**Location:** `src/lib/hunter/services/gemini.ts`

Two extraction patterns:
- `extractKnowledgeCard()` - Structured fact extraction with Zod schema
- `synthesize()` - Free-form analysis with JSON output

**Extension point:** Both methods use prompt templates. New extractors can be added:
```typescript
async extractWithSchema<T>(
  prompt: string,
  schema: ZodSchema<T>,
  snippets: string[]
): Promise<{ data: T; tokensUsed: number }>
```

### 3. QueueService
**Location:** `src/lib/hunter/services/queue.ts`

Generic job queue with:
- Atomic claiming (prevents double-processing)
- Heartbeat monitoring
- Retry with exponential backoff
- Status tracking (pending → claimed → processing → completed/failed)

**Extension point:** Already generic. Any job type can use the queue.

---

## Potential Use Cases

### 1. Company Research
Research companies for B2B sales intelligence:

```typescript
const companyScout: ScoutConfig = {
  subject: 'Acme Corp',
  queryTemplates: [
    '{subject} company overview',
    '{subject} funding news',
    '{subject} employees LinkedIn',
    '{subject} tech stack builtwith',
    '{subject} news announcements',
  ],
  deepScrapePatterns: [/crunchbase\.com/, /linkedin\.com\/company/],
};
```

Knowledge Card schema:
```typescript
const CompanyKnowledgeCard = z.object({
  name: z.string(),
  website: z.string().url().nullable(),
  industry: z.string().nullable(),
  employee_count: z.string().nullable(),
  funding: z.object({
    total_raised: z.string().nullable(),
    last_round: z.string().nullable(),
    investors: z.array(z.string()),
  }),
  tech_stack: z.array(z.string()),
  key_people: z.array(z.object({
    name: z.string(),
    title: z.string(),
    linkedin: z.string().url().nullable(),
  })),
});
```

### 2. Product Research (Hardware/Gear)
Already have `ItemType = 'tool' | 'gear'`. Extend for physical products:

```typescript
const gearScout: ScoutConfig = {
  subject: 'Sony WH-1000XM5',
  queryTemplates: [
    '{subject} review',
    '{subject} specs specifications',
    '{subject} vs {competitor}',
    '{subject} reddit worth it',
    '{subject} problems issues',
  ],
};
```

### 3. Content/Topic Research
Research a topic for content creation:

```typescript
const topicScout: ScoutConfig = {
  subject: 'remote work productivity',
  queryTemplates: [
    '{subject} best practices',
    '{subject} statistics data',
    '{subject} common problems',
    '{subject} reddit tips',
    '{subject} expert advice',
  ],
};
```

Output: Content brief with key points, statistics, common questions, expert quotes.

### 4. Competitor Intelligence
Research competitors for a given tool:

```typescript
const competitorScout: ScoutConfig = {
  subject: 'Notion competitors',
  queryTemplates: [
    '{subject} alternatives 2024',
    '{subject} vs comparison',
    '{subject} switching from',
    'best {category} tools', // Broader category search
  ],
};
```

---

## Generalization Roadmap

### Phase 1: Abstract the Scout Layer
Create `src/lib/research/scout.ts`:
```typescript
export interface ScoutConfig {
  subject: string;
  queryTemplates: string[];
  context?: string;
  deepScrapePatterns?: RegExp[];
  maxResultsPerQuery?: number;
}

export interface ScoutResult {
  snippets: Map<string, string[]>;  // query category → snippets
  sources: Source[];
  deepContent: Map<string, string>; // URL → markdown content
}

export class Scout {
  constructor(private serper: SerperService) {}

  async research(config: ScoutConfig): Promise<ScoutResult>
}
```

### Phase 2: Schema-Driven Extraction
Create `src/lib/research/extractor.ts`:
```typescript
export interface ExtractionConfig<T> {
  schema: ZodSchema<T>;
  prompt: string;
  temperature?: number;
}

export class Extractor {
  constructor(private gemini: GeminiService) {}

  async extract<T>(
    config: ExtractionConfig<T>,
    snippets: string[]
  ): Promise<{ data: T; tokensUsed: number }>
}
```

### Phase 3: Generic Pipeline
Create `src/lib/research/pipeline.ts`:
```typescript
export interface PipelineConfig<TInput, TOutput> {
  name: string;
  scoutConfig: (input: TInput) => ScoutConfig;
  extractionConfigs: ExtractionConfig<unknown>[];
  persist: (output: TOutput, deps: Dependencies) => Promise<void>;
}

export class ResearchPipeline<TInput, TOutput> {
  constructor(private config: PipelineConfig<TInput, TOutput>) {}

  async run(input: TInput): Promise<TOutput>
}
```

---

## Current Hunter as Pipeline Example

```typescript
const hunterPipeline: PipelineConfig<HunterInput, HunterResult> = {
  name: 'tool-hunter',

  scoutConfig: (input) => ({
    subject: input.toolName,
    queryTemplates: [
      '{subject} reviews',
      '{subject} pricing plans features',
      '{subject} reddit review pros cons',
      // ... 12 queries
    ],
    deepScrapePatterns: [/pricing/],
  }),

  extractionConfigs: [
    {
      schema: KnowledgeCardSchema,
      prompt: KNOWLEDGE_CARD_PROMPT,
      temperature: 0.1,
    },
    {
      schema: AnalysisSchema,
      prompt: SYNTHESIS_PROMPT,
      temperature: 0.3,
    },
  ],

  persist: async (output, deps) => {
    // Upsert tool, context, review
    // Link categories
    // Create affiliate offer
  },
};
```

---

## Implementation Notes

### Keeping Hunter Working
Don't refactor Hunter itself. Build the abstraction alongside it:
1. Create `src/lib/research/` with Scout, Extractor, Pipeline
2. Hunter continues to work via `src/lib/hunter/`
3. New use cases use the research library
4. Eventually migrate Hunter to use the research library (optional)

### Token Optimization
Current Hunter uses ~2000-4000 tokens per tool. For high-volume use cases:
- Use smaller schemas (extract only what's needed)
- Skip synthesis pass for simple extractions
- Cache search results (Serper allows)
- Use embedding similarity to skip re-extraction of known entities

### Rate Limits
- Serper: 2,500 searches/month on free tier
- Gemini 2.0 Flash: 1,500 RPM
- Jina Reader: No hard limit but be respectful

---

## Example: Quick Company Lookup

```typescript
// scripts/research-company.ts
import { Scout, Extractor } from '@/lib/research';

const CompanySchema = z.object({
  name: z.string(),
  website: z.string().url().nullable(),
  description: z.string().nullable(),
  employee_range: z.string().nullable(),
  funding_stage: z.string().nullable(),
  headquarters: z.string().nullable(),
});

async function researchCompany(companyName: string) {
  const scout = new Scout(serper);
  const extractor = new Extractor(gemini);

  const scoutResult = await scout.research({
    subject: companyName,
    queryTemplates: [
      '{subject} company',
      '{subject} crunchbase',
      '{subject} linkedin',
    ],
  });

  const { data } = await extractor.extract({
    schema: CompanySchema,
    prompt: 'Extract company facts from these sources...',
  }, scoutResult.allSnippets);

  return data;
}

// Usage
const company = await researchCompany('Stripe');
console.log(company);
// { name: 'Stripe', website: 'https://stripe.com', ... }
```

---

## Summary

The Hunter ingestion layer is:
1. **Modular** - Scout, Extract, Persist are separate
2. **Schema-driven** - Zod schemas define extraction shape
3. **Queue-integrated** - Built-in job management
4. **Extensible** - Add new query templates, schemas, persistence logic

To use for other purposes:
1. Define your search queries (what to look for)
2. Define your schema (what to extract)
3. Define your persistence (where to store)
4. Wire it up as a pipeline or use components individually
