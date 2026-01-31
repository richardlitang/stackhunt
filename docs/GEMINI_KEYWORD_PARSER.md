# Gemini-Powered Keyword Parser

**Why Gemini Flash > Regex:**
- ✅ Handles variations: "X vs Y", "X versus Y", "compare X and Y"
- ✅ Understands context: "best X for Y" vs "best X in Y" vs "top X for Y"
- ✅ Extracts implicit info: "slack alternative for remote teams" → tools + context
- ✅ Cheap: ~$0.000001 per keyword (vs $0.50+ for wasted hunt)
- ✅ Flexible: Can add new patterns without code changes

---

## Implementation Design

### 1. Keyword Intent Parser

**File:** `src/lib/hunter/services/keyword-parser.ts`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

interface KeywordIntent {
  type: 'CONTEXT' | 'TOOL_REVIEW' | 'COMPARISON' | 'ALTERNATIVES' | 'MULTI_COMPARISON';
  tools: string[];           // Extracted tool names
  context?: string;          // Extracted context ("for startups", "for designers")
  category?: string;         // Tool category ("CRM", "SEO", "Design")
  actionPlan: Action[];      // What to do
}

interface Action {
  type: 'hunt_tool' | 'create_context' | 'create_comparison' | 'discover_competitors' | 'review_in_context';
  params: Record<string, any>;
}

const KEYWORD_ANALYSIS_PROMPT = `You are a keyword intent analyzer for a software review platform.

Given a search keyword, analyze what the user wants and extract structured information.

KEYWORD TYPES:
1. CONTEXT - "best X for Y" - wants list of tools in category X optimized for use case Y
2. TOOL_REVIEW - "X review" - wants detailed review of specific tool X
3. COMPARISON - "X vs Y" or "X versus Y" - wants head-to-head comparison of 2 tools
4. ALTERNATIVES - "X alternatives" or "X competitors" - wants list of tools similar to X
5. MULTI_COMPARISON - "X vs Y vs Z" - wants comparison of 3+ tools

EXTRACTION RULES:
- tools: Extract ALL tool names mentioned (e.g., "discord vs slack" → ["Discord", "Slack"])
- context: Extract the "for X" or "in Y" context if present (e.g., "for startups", "for remote teams")
- category: Infer tool category from keyword (e.g., "best crm" → "CRM", "seo tools" → "SEO")

ACTION PLAN:
Based on the keyword type, determine what actions are needed:

CONTEXT type:
  1. create_context (title from keyword)
  2. discover_tools (find existing tools in category)
  3. review_in_context (review those tools for the context)

TOOL_REVIEW type:
  1. hunt_tool (research the tool if not in DB)
  2. create_review (generate standalone review)

COMPARISON type:
  1. hunt_tool (for each tool if not in DB)
  2. create_comparison (generate comparison page)
  3. create_context (if "for X" context present)
  4. review_in_context (review both tools in context)

ALTERNATIVES type:
  1. hunt_tool (research anchor tool)
  2. discover_competitors (from tool's competitor list)
  3. hunt_tool (for each competitor not in DB)
  4. create_context (title: "{Tool} Alternatives")
  5. review_in_context (review all in context)

Output ONLY valid JSON matching this schema:
{
  "type": "<CONTEXT|TOOL_REVIEW|COMPARISON|ALTERNATIVES|MULTI_COMPARISON>",
  "tools": ["Tool1", "Tool2"],
  "context": "<extracted context or null>",
  "category": "<inferred category or null>",
  "actionPlan": [
    {
      "type": "hunt_tool|create_context|create_comparison|discover_competitors|review_in_context",
      "params": {
        "tool_name": "...",
        "context_title": "...",
        // ... other params
      }
    }
  ]
}

Keyword to analyze: {{keyword}}`;

export async function parseKeywordIntent(keyword: string): Promise<KeywordIntent> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
      responseMimeType: 'application/json',
    },
  });

  const prompt = KEYWORD_ANALYSIS_PROMPT.replace('{{keyword}}', keyword);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return JSON.parse(text) as KeywordIntent;
}
```

---

### 2. Defunct Tool Detection

**File:** `src/lib/hunter/services/defunct-detector.ts`

```typescript
const DEFUNCT_DETECTION_PROMPT = `You are analyzing search results to determine if a software tool is still active or has shut down.

Search results will contain snippets from web searches about the tool. Analyze these to determine:
1. Is the tool still operational?
2. If defunct, when did it shut down?
3. What was the reason (acquired, discontinued, merged)?

INDICATORS OF DEFUNCT STATUS:
- "shut down", "discontinued", "no longer available"
- "service ended", "ceased operations"
- "acquired and closed", "merged into"
- Official announcements of closure
- Domain expired or redirects to acquirer

Output ONLY valid JSON:
{
  "isDefunct": <boolean>,
  "confidence": "<high|medium|low>",
  "shutdownDate": "<YYYY-MM-DD or null>",
  "reason": "<brief reason or null>",
  "evidence": "<quote from search results>"
}

Tool name: {{toolName}}

Search results:
{{searchResults}}`;

export async function detectDefunctTool(
  toolName: string,
  searchResults: string[]
): Promise<DefunctStatus> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const prompt = DEFUNCT_DETECTION_PROMPT
    .replace('{{toolName}}', toolName)
    .replace('{{searchResults}}', searchResults.slice(0, 10).join('\n\n'));

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return JSON.parse(text) as DefunctStatus;
}
```

---

### 3. Integration into Queue Worker

**File:** `scripts/queue-content-ideas.ts` (UPDATED)

```typescript
import { parseKeywordIntent } from '../src/lib/hunter/services/keyword-parser.js';

async function queueContentIdea(idea: ContentIdea) {
  console.log(`📌 Analyzing: ${idea.keyword}`);

  // Parse with Gemini
  const intent = await parseKeywordIntent(idea.keyword);

  console.log(`   Type: ${intent.type}`);
  console.log(`   Tools: ${intent.tools.join(', ')}`);
  console.log(`   Context: ${intent.context || 'none'}`);
  console.log(`   Actions: ${intent.actionPlan.length} steps`);

  // Execute action plan
  for (const action of intent.actionPlan) {
    switch (action.type) {
      case 'hunt_tool':
        await queueToolHunt(action.params.tool_name, idea.id);
        break;

      case 'create_context':
        await createContext(action.params.context_title);
        break;

      case 'create_comparison':
        await queueComparison(action.params.tool_a, action.params.tool_b);
        break;

      case 'discover_competitors':
        await discoverAndQueueCompetitors(action.params.anchor_tool);
        break;

      case 'review_in_context':
        await queueContextualReviews(action.params.context_id, action.params.tool_ids);
        break;
    }
  }

  // Mark as queued
  await supabase
    .from('content_ideas')
    .update({
      status: 'queued',
      keyword_type: intent.type,
      extracted_tools: intent.tools,
    })
    .eq('id', idea.id);
}
```

---

### 4. Integration into Hunter

**File:** `src/lib/hunter/phases/research.ts` (UPDATED)

```typescript
import { detectDefunctTool } from '../services/defunct-detector.js';

export async function research(toolName: string): Promise<ResearchResult> {
  // ... existing search code ...

  const searchResults = await performWebSearch(toolName);

  // Check if tool is defunct
  const defunctStatus = await detectDefunctTool(toolName, searchResults);

  if (defunctStatus.isDefunct && defunctStatus.confidence === 'high') {
    return {
      success: false,
      skipped: true,
      reason: 'tool_defunct',
      details: {
        shutdown_date: defunctStatus.shutdownDate,
        reason: defunctStatus.reason,
        evidence: defunctStatus.evidence,
      },
    };
  }

  // Continue with normal research...
}
```

---

## Example Runs

### Input: "discord vs slack for work"

**Gemini Flash Output:**
```json
{
  "type": "COMPARISON",
  "tools": ["Discord", "Slack"],
  "context": "for work",
  "category": "Communication",
  "actionPlan": [
    {
      "type": "hunt_tool",
      "params": { "tool_name": "Discord" }
    },
    {
      "type": "hunt_tool",
      "params": { "tool_name": "Slack" }
    },
    {
      "type": "create_comparison",
      "params": {
        "tool_a": "Discord",
        "tool_b": "Slack",
        "slug": "discord-vs-slack"
      }
    },
    {
      "type": "create_context",
      "params": { "context_title": "Best for Work" }
    },
    {
      "type": "review_in_context",
      "params": {
        "tools": ["Discord", "Slack"],
        "context": "Best for Work"
      }
    }
  ]
}
```

**Actions Executed:**
1. Queue hunt: Discord
2. Queue hunt: Slack
3. Create comparison page
4. Create context "Best for Work"
5. Queue 2 contextual reviews

**Result:** 5 pages from 1 keyword ✅

---

### Input: "typeform alternatives"

**Gemini Flash Output:**
```json
{
  "type": "ALTERNATIVES",
  "tools": ["Typeform"],
  "context": null,
  "category": "Forms",
  "actionPlan": [
    {
      "type": "hunt_tool",
      "params": { "tool_name": "Typeform" }
    },
    {
      "type": "discover_competitors",
      "params": { "anchor_tool": "Typeform" }
    },
    {
      "type": "create_context",
      "params": { "context_title": "Typeform Alternatives" }
    }
  ]
}
```

**Actions Executed:**
1. Hunt Typeform
2. Read Typeform.specs.competitors → ["Google Forms", "Tally", "Jotform"]
3. Queue hunts for each competitor (if not in DB)
4. Create context "Typeform Alternatives"
5. Queue reviews for all tools in context

**Result:** 6+ pages from 1 keyword ✅

---

### Input: "bench accounting review" (DEFUNCT)

**Search Results:**
```
"Bench accounting shut down in March 2024 after acquisition by Intuit"
"Bench service discontinued, users migrated to QuickBooks"
```

**Gemini Flash Output:**
```json
{
  "isDefunct": true,
  "confidence": "high",
  "shutdownDate": "2024-03-01",
  "reason": "Acquired by Intuit, service discontinued",
  "evidence": "Bench accounting shut down in March 2024 after acquisition by Intuit"
}
```

**Actions Executed:**
1. Skip hunt (don't waste API credits)
2. Update content_ideas:
   ```json
   {
     "status": "skipped",
     "skip_reason": "tool_defunct",
     "skip_permanent": true,
     "skip_details": {
       "shutdown_date": "2024-03-01",
       "reason": "Acquired by Intuit, service discontinued"
     }
   }
   ```

**Result:** $0 spent, graceful skip ✅

---

## Cost Analysis

**Per Keyword:**
- Gemini Flash: ~1,000 tokens @ $0.000001/token = **$0.001**
- Full hunt (if needed): ~30,000 tokens = **$0.50**

**Savings Example:**
- "bench accounting review" (defunct)
  - Regex approach: $0.50 (wasted hunt)
  - Gemini approach: $0.001 (detect + skip)
  - **Savings: $0.499** (99.8%)

**ROI Example:**
- 169 pending keywords
- Assume 10% defunct (17 tools)
- Regex approach: 17 × $0.50 = **$8.50 wasted**
- Gemini approach: 17 × $0.001 = **$0.017**
- Plus 169 × $0.001 = **$0.169** for parsing
- **Total cost: $0.186 vs $8.50** = **97.8% savings**

---

## Implementation Checklist

- [ ] Create `src/lib/hunter/services/keyword-parser.ts`
- [ ] Create `src/lib/hunter/services/defunct-detector.ts`
- [ ] Update `scripts/queue-content-ideas.ts` to use parser
- [ ] Update `src/lib/hunter/phases/research.ts` for defunct detection
- [ ] Add DB columns: `keyword_type`, `extracted_tools`, `skip_reason`, `skip_permanent`
- [ ] Test with all 10 example keywords
- [ ] Backfill 169 pending keywords with Gemini analysis

---

## Benefits Over Regex

| Feature | Regex | Gemini Flash |
|---------|-------|-------------|
| Handle variations | ❌ "X vs Y" only | ✅ "X vs Y", "X versus Y", "compare X and Y" |
| Context extraction | ❌ Hard-coded patterns | ✅ Intelligent inference |
| Tool name extraction | ❌ Brittle, fails on edge cases | ✅ Robust, handles typos/variations |
| Defunct detection | ❌ Not possible | ✅ Analyzes search results |
| Maintainability | ❌ Complex regex patterns | ✅ Natural language prompts |
| Cost per keyword | $0 (but wastes $0.50 on bad hunts) | $0.001 (prevents $0.50 waste) |

**Verdict:** Gemini Flash wins decisively! 🏆

---

*Generated: 2026-01-31*
