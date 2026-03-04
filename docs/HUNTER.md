# Hunter Implementation Guide

Last verified: 2026-03-05

## Quick Start

```typescript
import { createHunter } from '@/lib/hunter';

// Create hunter instance
const hunter = createHunter({ isDraftMode: true });

// Hunt for a tool
const result = await hunter.hunt({
  toolName: 'QuickBooks',
  contextTitle: 'Best Accounting Software',
});

// Process queue
await hunter.processNextFromQueue();
```

## Phase Breakdown

### Phase 1: Research

**Goal**: Gather facts and detect duplicates

**Steps**:
1. **Scout** - 3 specialized Serper searches:
   - Reviews & opinions
   - Pricing & features
   - Alternatives & comparisons
2. **Extract** - Gemini extracts structured facts (temp=0.1)
   - Creates 8-section KnowledgeCard
   - Quality score: "high", "medium", "low"
3. **Gatekeeper** - Check for duplicate tools:
   - Exact name match
   - Website URL match
   - High similarity (>90%)

**Early Exit**: If duplicate found, skip Phase 2 & 3, return existing tool ID.

**Output**:
```typescript
interface ResearchOutput {
  scoutResult: {
    reviewsSnippets: string[];
    pricingSnippets: string[];
    alternativesSnippets: string[];
    sources: Array<{url, title, snippet, domain}>;
  };
  knowledgeCard: KnowledgeCard;
  tokensUsed: number;
  isDuplicate?: boolean;
  existingToolId?: string;
}
```

### Phase 2: Analysis

**Goal**: Generate contextual review with embeddings

**Steps**:
1. **Fetch categories** - Load existing graph tags for recommendations
2. **Load prompt** - Get synthesis prompt from DB or use fallback
3. **Build context** - Format KnowledgeCard as markdown for prompt
4. **Synthesize** - Gemini generates review (temp=0.3):
   - Score (0-100)
   - Pros/cons with source URLs
   - Summary (150-300 words)
   - Graph tags (functions, audiences, platforms)
5. **Embed** - Generate 768-dim vector for semantic search
6. **Logo** - Fetch and upload logo (3 fallback sources)

**Output**:
```typescript
interface AnalysisOutput {
  analysis: HunterAnalysis;
  embedding: number[];
  logo: { path: string; url: string } | null;
  tokensUsed: number;
}
```

### Phase 3: Persistence

**Goal**: Save everything with legal protection

**Steps**:
1. **Upsert Tool** - Save with KnowledgeCard as metadata
2. **Create Graph Links** - Link to functions, audiences, platforms
3. **Create Affiliate Offer** - Default "Visit Website" CTA
4. **Dedup Context** - Check for similar contexts (>90% similarity)
5. **Create Review** - With source attribution:
   - Normalize pros/cons (add source_url, source_type, claim_type)
   - Apply negative sentiment guardrail (2+ sources for opinions)
   - Auto-publish if high confidence
6. **Save Sources** - Audit trail for legal protection

**Auto-Publish Logic**:
```typescript
const isHighConfidence =
  knowledgeCard.meta.data_quality === 'high' &&
  analysis.score >= 70 &&
  filteredCons.length <= 1 &&
  normalizedCons.length >= 2;

if (isHighConfidence) {
  status = 'published';
} else {
  status = 'draft';
}
```

**Output**:
```typescript
interface PersistenceOutput {
  toolId: string;
  contextId: string | null;
  reviewId: string | null;
  wasReused: boolean;
}
```

## Services API

### SerperService

```typescript
const serper = new SerperService({ apiKey: 'xxx' });

// Scout for tool
const result = await serper.scout('Notion', 'Best Note-Taking Apps');
// Returns: { reviewsSnippets, pricingSnippets, alternativesSnippets, sources }

// Scout for context
const contextResult = await serper.scoutForContext('Best CRM Software');
// Returns: { toolsSnippets, reviewsSnippets, pricingSnippets }
```

### GeminiService

```typescript
const gemini = new GeminiService({ apiKey: 'xxx' });

// Extract facts (Pass 1)
const { knowledgeCard, tokensUsed } = await gemini.extractKnowledgeCard({
  toolName: 'Notion',
  reviewsSnippets: [...],
  pricingSnippets: [...],
  alternativesSnippets: [...],
});

// Synthesize review (Pass 2)
const { analysis, tokensUsed } = await gemini.synthesize({
  toolName: 'Notion',
  knowledgeCardFacts: buildFactSummary(knowledgeCard),
  existingCategories: { functions: [...], audiences: [...], platforms: [...] },
  promptTemplate: '...',
  ...
});

// Generate embedding
const embedding = await gemini.generateEmbedding('Notion is a ...');
// Returns: number[] (768 dimensions)
```

### LogoService

```typescript
const logo = new LogoService({ supabase });

const result = await logo.fetchAndUpload('Notion', 'https://notion.so');
// Returns: { path: 'logos/notion.png', url: 'https://...' } | null
```

### QueueService

```typescript
const queue = new QueueService({ supabase });

// Claim next item
const { success, queueItem } = await queue.claimNext();

// Start heartbeat
queue.startHeartbeat(queueItem.id);

// Mark complete
await queue.markCompleted(queueItem.id, { toolId, contextId, reviewId });

// Cleanup
queue.cleanup();
```

## Utilities

### slugify

```typescript
import { slugify } from '@/lib/hunter';

slugify('Best Note-Taking Apps'); // => "best-note-taking-apps"
```

### interpolateTemplate

```typescript
import { interpolateTemplate } from '@/lib/hunter';

const template = 'Hello {{name}}!';
const result = interpolateTemplate(template, { name: 'World' });
// => "Hello World!"

// Conditional blocks
const template2 = '{{#context}}Context: {{context}}{{/context}}';
interpolateTemplate(template2, { context: 'Testing' }); // => "Context: Testing"
interpolateTemplate(template2, { context: '' });        // => ""
```

### buildFactSummary

```typescript
import { buildFactSummary } from '@/lib/hunter';

const markdown = buildFactSummary(knowledgeCard);
// Returns formatted markdown with all verified facts
```

### classifySourceType

```typescript
import { classifySourceType } from '@/lib/hunter';

classifySourceType('https://notion.so/pricing', 'https://notion.so');
// => "official"

classifySourceType('https://reddit.com/r/notion');
// => "community"

classifySourceType('https://g2.com/products/notion');
// => "editorial"
```

## Testing

### Mocking Dependencies

```typescript
const mockDeps: HunterDependencies = {
  supabase: mockSupabase,
  serper: mockSerper,
  gemini: mockGemini,
  logo: mockLogo,
  config: { isDraftMode: true, ... },
  withRetry: async (fn) => fn(),
  log: jest.fn(),
};

const result = await executeResearchPhase(ctx, mockDeps);
```

### Testing Early Exits

```typescript
it('skips analysis when duplicate detected', async () => {
  // Mock existing tool
  mockSupabase.from('tools').select().mockResolvedValue({
    data: [{ id: 'existing-id', name: 'Notion' }],
    error: null,
  });

  const ctx: HunterContext = {
    toolName: 'Notion',
    startTime: Date.now(),
    tokensUsed: 0,
    logs: [],
  };

  const result = await executeResearchPhase(ctx, mockDeps);

  expect(result.isDuplicate).toBe(true);
  expect(result.existingToolId).toBe('existing-id');
  expect(ctx.skipAnalysis).toBe(true);
});
```

## CLI Usage

### Direct Hunt

```bash
npm run hunt -- --tool="Notion" --context="Best Note-Taking Apps"
```

### Queue Operations

```bash
# Add to queue
npm run hunt -- --queue=add --tool="Notion" --priority=80

# Process next item
npm run hunt -- --queue=process

# Process batch
npm run hunt -- --queue=batch --limit=10

# View queue status
npm run hunt -- --queue=status
```

### Strategy Operations

```bash
# Analyze keywords
npm run hunt -- --strategy=analyze

# Import from CSV
npm run hunt -- --strategy=import --file=keywords.csv

# Auto-approve high ROI
npm run hunt -- --strategy=approve --priority=100
```

## Environment Variables

```bash
# Required for all operations
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Required for hunting (AI operations)
GEMINI_API_KEY=xxx
SERPER_API_KEY=xxx
```

## Common Patterns

### Custom Orchestration

```typescript
import {
  executeResearchPhase,
  executeAnalysisPhase,
  executePersistencePhase,
} from '@/lib/hunter';

// Research only (no persistence)
const ctx = createContext({ toolName: 'Notion' });
ctx.research = await executeResearchPhase(ctx, deps);

// Custom validation
if (ctx.research.knowledgeCard.meta.data_quality === 'low') {
  ctx.skipAnalysis = true;
}

// Continue only if high quality
if (!ctx.skipAnalysis) {
  ctx.analysis = await executeAnalysisPhase(ctx, deps);
  await executePersistencePhase(ctx, deps);
}
```

### Batch Processing

```typescript
const hunter = createHunter();

const tools = ['Notion', 'ClickUp', 'Asana', 'Monday'];

for (const toolName of tools) {
  const result = await hunter.hunt({
    toolName,
    contextTitle: 'Best Project Management Tools',
  });

  console.log(`${toolName}: ${result.success ? '✅' : '❌'}`);
}
```

### Queue Worker

```typescript
const hunter = createHunter();

// Process queue until empty
while (true) {
  const result = await hunter.processNextFromQueue();

  if (result.error === 'No items in queue') {
    console.log('Queue empty, exiting');
    break;
  }

  console.log(`Processed: ${result.toolId}`);
}

hunter.cleanup(); // Stop heartbeat
```

## Troubleshooting

### Common Issues

**TypeError: Cannot read property 'map' of undefined**
- Likely missing phase data in context
- Ensure research phase completes before analysis
- Check early exit flags

**"Missing required environment variables"**
- Set all 4 env vars (see above)
- Use `dotenv` or `.env` file
- Check spelling (SERPER not SERPAPI)

**"Failed to save tool: duplicate key value"**
- Tool with slug already exists
- This is expected - upsert will update existing
- Check `onConflict: 'slug'` in persistence phase

**"Guardrail filtered all cons"**
- All negative claims lacked 2+ source corroboration
- Review will have 0 cons (unusual but legal)
- Consider relaxing guardrail or improving research

### Debug Mode

```typescript
const hunter = createHunter({ isDraftMode: true });

const result = await hunter.hunt({ toolName: 'Test' });

// View all logs
console.log(hunter.getLogs());

// Check token usage
console.log(`Tokens: ${result.tokensUsed}`);

// Check phase completion
if (result.contextId) {
  console.log('All 3 phases completed');
} else {
  console.log('Early exit or error');
}
```

## Performance Tips

1. **Use queue for batch** - Better resource utilization
2. **Enable auto-publish** - Reduces manual review load
3. **Monitor duplicate rate** - High rate = wasted API calls
4. **Track token usage** - Optimize prompts if costs spike
5. **Use draft mode** - Catch issues before going live