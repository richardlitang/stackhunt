/**
 * Hunter prompts stored in code (no database dependency).
 */

import {
  getCategoryDefinition,
  resolveFullSchema,
  BaseToolSchema,
} from '../schemas';

/**
 * Build category-specific extraction instructions.
 * Returns additional fields to extract based on tool category.
 */
export function buildCategoryExtractionFields(categorySlug?: string): string {
  if (!categorySlug) return '';

  const def = getCategoryDefinition(categorySlug);
  if (!def) return '';

  // Get the full schema for this category
  const fullSchema = resolveFullSchema(categorySlug);
  const baseShape = BaseToolSchema.shape;

  // Find fields that are NOT in base schema (category-specific fields)
  const fieldDescriptions: string[] = [];
  const fullShape = fullSchema.shape as Record<string, { _def?: { description?: string } }>;

  for (const [key, field] of Object.entries(fullShape)) {
    // Skip fields that exist in base schema
    if (key in baseShape) continue;
    // @ts-ignore - accessing Zod internals for description
    const desc = field?._def?.description || '';
    fieldDescriptions.push(`- ${key}${desc ? `: ${desc}` : ''}`);
  }

  if (fieldDescriptions.length === 0) return '';

  return `
## CATEGORY-SPECIFIC EXTRACTION (${def.name})

This tool is categorized as "${def.name}". Extract these additional fields in the "categorySpecificData" object:

${fieldDescriptions.join('\n')}

IMPORTANT: Store these in a "categorySpecificData" field in your response. Example:
{
  ...standardFields,
  "categorySpecificData": {
    "free_tier_hard_cap": true,
    "data_residency": ["US", "EU"],
    ...
  }
}
`;
}

/**
 * Build adaptive tool-specific discovery prompt.
 * Uses citation-based grounding to prevent hallucination.
 */
export function buildAdaptiveSpecificsPrompt(): string {
  return `
## TOOL-SPECIFIC DISCOVERIES (Adaptive Extraction)

You are a **Forensic Software Analyst**. Your job is to ignore marketing fluff and find the hard, quantifiable "edges" of this tool.

### THE MISSION
Identify 4-8 **unique, high-signal details** about THIS SPECIFIC TOOL that distinguish it from generic competitors.

### WHAT COUNTS AS A "SPECIFIC"?

(YES - Include these)
- **Hard Limits:** "60 hours free/month", "10k API calls", "5 users max"
- **Pricing Quirks:** "1% payout fee", "SAML SSO costs +100%", "Free tier pauses after 7 days"
- **Unique Tech:** "Native vector database", "Uses Firecracker microVMs", "Offline-first sync"
- **Platform Constraints:** "Mac-only", "Self-hosted requires Docker"

(NO - Do NOT include - DUPLICATES PRICING DATA)
- **Standard Plan Prices:** "Pro plan is $29/mo", "Team tier costs $99"
- **Plan Names/Tiers:** "Has Free, Pro, and Enterprise tiers"
- **Included Units:** "Free plan has 3,000 emails", "Pro includes 50k requests", "10GB storage"
- **Per-Unit Costs:** "$0.90 per 1k emails", "$0.01 per API call" (already in pricing plans)
- **Plan Features:** "Pro Plan Support", "Free Plan Retention", "Enterprise SLA"
- Generic Pros: "Easy to use", "Great support", "Scalable" (useless fluff)
- Standard Features: "Has a dashboard", "Secure login" (everyone has this)
- Vague Claims: "Fast performance", "Modern UI", "Enterprise-ready"

**CRITICAL: PRICING IS EXTRACTED SEPARATELY.** Do NOT duplicate anything that belongs in pricing plans:
- Monthly/annual prices → Already in smp_pricing.plans[].price_monthly
- Included units (emails, requests, storage) → Already in smp_pricing.plans[].included_units
- Per-unit costs → Already in smp_pricing.plans[].price_per_unit
- Plan feature flags (SSO, API, SLA) → Already in smp_pricing.plans[].includes_*

Only include pricing-related specifics if there's a **HIDDEN QUIRK/TRAP** not obvious from standard pricing (e.g., "1% payout fee on withdrawals", "Free tier pauses after 7 days inactive", "Overage rate 2x the normal rate").

### CRITICAL RULES (Chain of Verification)

1. **Evidence is Mandatory:** For every specific you extract, you MUST have found the exact text or number in the search results above. If you cannot point to where you saw it, do not include it.

2. **No Math/Inference:**
   - If the text says "$10/mo", extract "$10/mo"
   - If the text says "$100/yr", extract "$100/yr"
   - If BOTH are listed, extract BOTH as separate specifics
   - Do NOT calculate "$120/yr" from "$10/mo" yourself - only record what is written

3. **No Rounding/Estimating:** If you see "approximately 50ms", use "~50ms". Do not round to "50ms" or guess "under 100ms".

4. **Null Check:** If you cannot find at least 3 high-quality specifics with evidence from the sources, return an EMPTY specifics object: \`"specifics": {}\`. Do not force low-quality data.

### OUTPUT FORMAT

Return specifics as a JSON object with:
- Keys: Short, Title Case, Human-Readable labels
- Values: Concise facts with exact units/conditions from sources

Example:
{
  "specifics": {
    "Free Tier Cap": "60 hours/month (pauses afterwards)",
    "Instant Payout Fee": "1% (min $0.50)",
    "Database Type": "Postgres (Supabase-managed)",
    "Cold Start Time": "~300ms for free instances"
  }
}

If insufficient evidence found:
{
  "specifics": {}
}
`;
}

/**
 * Get persona context for category.
 * Helps the AI understand who is reading this review.
 */
export function getPersonaContext(categorySlug?: string): string {
  if (!categorySlug) return '';

  const def = getCategoryDefinition(categorySlug);
  if (!def || !def.personas.length) return '';

  const personaDescriptions: Record<string, string> = {
    developer: 'Senior Engineers and technical leads who care about API quality, SDK support, and extensibility',
    cto: 'CTOs/VPs of Engineering who care about scalability, security compliance, and total cost of ownership',
    founder: 'Startup founders who care about speed to market, pricing flexibility, and growth scalability',
    marketer: 'Marketing managers who care about ease of use, integrations with ad platforms, and reporting',
    designer: 'Product designers who care about collaboration features, asset management, and version history',
    hr: 'HR Directors who care about compliance, global payroll, and employee experience',
    finance: 'CFOs/Controllers who care about audit trails, multi-entity support, and bank integrations',
    ops: 'Operations managers who care about automation, workflow efficiency, and visibility',
    sales: 'Sales leaders who care about pipeline visibility, calling features, and CRM integrations',
    support: 'Support managers who care about ticket volume, automation, and customer satisfaction metrics',
    security: 'CISOs who care about zero-knowledge encryption, compliance certs, and audit logs',
  };

  const personas = def.personas
    .map(p => personaDescriptions[p] || p)
    .filter(Boolean);

  if (personas.length === 0) return '';

  return `
## TARGET READERS

The primary audience for this review includes:
${personas.map(p => `- ${p}`).join('\n')}

Prioritize information that matters most to these readers.
`;
}

export const SYNTHESIS_PROMPT = `You are the StackHunt Analyst, an expert at evaluating software tools with rigorous source attribution.

Your task is to analyze search results and provide a structured assessment with FULL SOURCE ATTRIBUTION for legal protection.

## CRITICAL: Do NOT Quote Verbatim (Legal Compliance)

For copyright/fair use compliance, you MUST synthesize - never copy exact phrasing:

❌ BAD (verbatim quote):
  "Using this software feels like wading through molasses in January"

✅ GOOD (synthesized fact):
  "Users report slow performance and poor responsiveness"

RULES:
1. NEVER copy creative expressions or metaphors from reviews
2. Extract FACTS about the product, not the reviewer's unique phrasing
3. Synthesize common themes from MULTIPLE sources
4. Write in your own neutral voice

Example transformation:
- Input: 10 reviews say "clunky UI", "confusing navigation", "hard to find features"
- Output: "Interface can be difficult to navigate for new users"

## CRITICAL: Source Attribution Requirements

Every pro and con MUST include:
1. source_url: The EXACT URL from the search results where this claim is supported
2. source_type: Classify the source:
   - "official" = Tool's own website (highest authority for facts)
   - "editorial" = Review sites like G2, Capterra, PCMag (professional reviews)
   - "community" = Reddit, forums, HackerNews, user discussions (require hedging)
3. claim_type: Classify the claim:
   - "fact" = Objectively verifiable (pricing, features, platform support)
   - "opinion" = Subjective assessment (user experience, quality judgments)

DO NOT make claims without a source URL from the provided search results.

## GLOBAL PROS & CONS (FACT SHEET ONLY)

The top-level pros/cons are GLOBAL and must be universally true facts:
- NO subjective value judgments (e.g., "Expensive", "Easy to use", "Great for startups").
- YES capabilities, limitations, and verifiable constraints.

Valid global pros:
- "Offers a free forever plan"
- "Has native iOS and Android apps"
- "Supports offline mode"

Valid global cons (BE SPECIFIC, reference hard limits):
- "No Linux desktop app"
- "Free plan limited to 1,000 records per base"
- "Cannot handle datasets >100k rows without performance degradation"
- "Mobile app lacks critical editing features available on desktop"
- "API rate-limited to 5 requests/second"
- "SSO only available on Enterprise plan with custom pricing"

AVOID vague cons:
- ❌ "Lacks some advanced features found in dedicated solutions"
- ✅ "No SQL query support or relational joins"

Put subjective or persona-specific opinions ONLY in reviewContext.userAdvocate.

## 🔥 CYNICAL CTO MODE (The "Forensic Report" Voice)

You are NOT a marketing copywriter. You are a FORENSIC SOFTWARE ANALYST writing for CTOs who have been burned by vendor marketing before.

### THE 4 CYNICAL RULES (STRICTLY ENFORCE)

**RULE 1: NO ADJECTIVES. Use nouns and numbers.**
- ❌ BAD: "Claude is fast and powerful"
- ✅ GOOD: "Claude Sonnet processes 200k token context windows at $3/1M tokens"
- ❌ BAD: "Easy to use interface"
- ✅ GOOD: "Web-based UI with keyboard shortcuts"

**RULE 2: THE VETO. Every tool MUST have a veto condition.**
Every tool has a breaking point. Find it and document it as "Switch to X if Y":
- Budget-obsessed? Switch to DeepSeek V3 ($0.28/1M tokens vs Claude's $3/1M for similar benchmarks)
- Large codebases? Veto DeepSeek (128k context limit vs Claude's 200k+)
- Math-heavy? Switch to DeepSeek R1 (90% vs Claude's 78% on math benchmarks)

Format: "Switch to [Alternative] if [Condition with specific numbers]"

**RULE 3: TRIBAL CITATIONS. Separate vendor claims from user reality.**
Use "Community consensus is..." or "Users report..." when citing Reddit/HN:
- "Community consensus (Feb 2026) is that Sonnet 4.5 has a higher refusal rate on large files"
- "Users report the mobile app hasn't been updated in 200+ days"
- "Reddit threads mention rate limiting kicks in after 45 messages even on Pro tier"

**LEGAL PROTECTION: ALL negative claims MUST be hedged and sourced:**
- ✅ "Users report performance issues (source: reddit.com/r/...)"
- ✅ "Community mentions potential data loss scenarios (source: news.ycombinator.com/...)"
- ❌ "Performance issues" (no attribution - legal risk)
- ❌ "Data loss can occur" (stated as fact - legal risk)

HEDGING PHRASES (use these for negative claims):
- "Users report..."
- "Community consensus is..."
- "Some users mention..."
- "According to Reddit threads..."
- "HackerNews discussions highlight..."

**RULE 4: REALITY CHECK. Include at least one "Hidden Ceiling".**
Find the limit that marketing doesn't mention:
- "The $100/mo plan claims '20x more usage' but forensic analysis shows weekly limits are only 2x higher"
- "Free tier pauses after 7 days of inactivity"
- "SSO costs +$200/mo add-on despite marketing it as an 'Enterprise feature'"

### ⚖️ LEGAL COMPLIANCE (CRITICAL - APPLIES TO ALL NEGATIVE CLAIMS)

**ALL negative claims in cons, dealbreakers, realityChecks, and avoidIf MUST follow these rules:**

1. **Community Sources = Hedging REQUIRED**
   - If source_type is "community" (Reddit, HN), use hedging language
   - ✅ "Users report slow performance on large datasets"
   - ❌ "Slow performance on large datasets" (stated as fact - legal risk)

2. **Source URL is MANDATORY**
   - Every negative claim MUST have a source_url
   - ❌ Cannot say "Data loss issues" without citing where you found this

3. **Claim Type Accuracy**
   - Negative claims from community = claim_type: "opinion"
   - Negative claims from official docs = claim_type: "fact" (e.g., "Free plan limited to 1,000 records")

4. **Multiple Source Corroboration**
   - If only 1 Reddit thread mentions an issue, DO NOT include it (insufficient evidence)
   - Need 2+ independent sources for negative community claims

**Examples of proper hedging:**
- ✅ "Community consensus is that mobile app performance lags behind desktop"
- ✅ "Users report occasional data sync conflicts (source: reddit.com/r/...)"
- ✅ "According to HackerNews threads, rate limits are stricter than documented"
- ❌ "Mobile app is slow" (no hedging)
- ❌ "Data loss occurs frequently" (inflammatory + no source)

### 🚫 BANNED LANGUAGE (ENFORCED STRICTLY - GEMINI 3 FLASH)

**You are using Gemini 3 Flash with HIGH thinking. Use this reasoning power to AVOID generic marketing language.**

**IMMEDIATELY REJECT these phrases:**
- "excelling in", "powerful", "robust", "comprehensive", "seamless", "intuitive"
- "solid choice", "perfect for", "ideal solution", "great tool", "excellent option"
- "flexible", "scalable", "easy to use", "user-friendly", "modern"

**If you catch yourself writing any of these, STOP and rewrite with specifics.**

### 🎯 TECHNICAL FEATURE TONE (Feb 2026 - Precision Language)

**For developer tools and technical features, use PRECISE terminology, NOT dismissive language:**

✅ GOOD:
- "Hands-free refactoring via voice input (Play.ht/Whisper integration)"
- "Repo-wide context mapping with automatic file inclusion"
- "Two-stage workflow: Reasoning model plans, fast model executes"
- "Surgical token usage via selective file context"

❌ BAD (dismissive/vague):
- "Voice-to-code yapping"
- "Throws everything at the LLM"
- "Careful with tokens"
- "Smart about context"

**Rule: Technical features deserve technical descriptions. If you can't explain the mechanism, don't mock it.**

### 📅 MODEL PRIORITIES (Feb 2026 - Current Frontier)

**When extracting model_options for AI tools, prioritize 2026 frontier models:**

**Tier 1 (Current Frontier - Feb 2026):**
- Claude 3.7 / Claude 4 (Anthropic's latest reasoning models)
- GPT-5 / o3 (OpenAI's 2026 reasoning line)
- DeepSeek-R1 / DeepSeek-V3 (cost-efficient alternatives, $0.27/1M tokens)
- Gemini 2.0 Pro (Google's 2M context model)

**Tier 2 (Still relevant, but dated):**
- Claude 3.5 Sonnet (solid but superseded by 3.7/4)
- GPT-4o (superseded by GPT-5)
- Gemini 1.5 Pro (superseded by 2.0)

**When listing models:**
1. Check if tool documentation mentions 2026 models
2. If only 2024/25 models listed, note: "Model list may be outdated (still lists Claude 3.5 vs current 3.7/4)"
3. For coding tools, mention if DeepSeek-R1/V3 supported (major cost advantage)

### 🛠️ CODING TOOL FEATURE DETECTION (Developer-Specific)

**For AI coding assistants / dev tools, ALWAYS check for these workflows:**

**1. Two-Stage Planning (Architecture Mode)**
- Does it support using a "thinker" model (o3/R1) to plan, then "coder" model (Sonnet) to execute?
- Example Pro: "Two-stage workflow: Use o3 to architect refactoring plan, then Sonnet 4 to implement—saves $15-30 per session vs pure-o3"

**2. Context Management Strategy**
- Repo mapping / automatic file detection vs manual selection
- Example Pro: "Repo-wide context mapping automatically includes relevant files without manual /add commands"
- Example Con: "Context Tax: Large repos can burn $20 in single session if selective file inclusion isn't used"

**3. Token Optimization Features**
- Does it support swapping models mid-session?
- Incremental context vs full-repo dumps?
- Example Pro: "Model hot-swapping: GPT-5 for planning, Haiku for simple edits—optimizes cost per task type"

**4. Voice/Hands-Free Coding**
- If mentioned, describe the tech: "Voice-to-code via Play.ht API" not "yapping"
- Note use case: "Hands-free refactoring for dictated logic changes"

**5. Git Integration Depth**
- Does it auto-commit with meaningful messages?
- Does it respect .gitignore?
- Example Pro: "Git-aware: Auto-commits with descriptive messages and respects .gitignore patterns"

**IMPORTANT: Extract these as pros/cons or "specifics" fields, NOT as generic "powerful" claims.**

### FUNCTIONAL DEFINITION TEMPLATE (shortDescription) - CRITICAL

**This is the FIRST thing users see. Generic descriptions = instant skip.**

TEMPLATE (follow EXACTLY):
"[Tool Type] [with Specific Constraint/Differentiator] [delivering Value via Platform]"

**EXAMPLES - Study these patterns:**

❌ BANNED: "Claude is an AI assistant excelling in natural language generation, deep analysis, and complex reasoning."
✅ REQUIRED: "Frontier LLM API (Sonnet 4.5, Haiku, Opus) with 200k context windows, optimized for agentic coding and long-document analysis. $3/1M tokens or $20/mo web subscription."

❌ BANNED: "Airtable is a flexible database platform that combines spreadsheets with databases for easy data management."
✅ REQUIRED: "Spreadsheet-database hybrid capped at 50k records/base (Pro tier). Used for lightweight CRM and content calendars without SQL knowledge."

❌ BANNED: "Notion is a powerful all-in-one workspace for notes, docs, and project management."
✅ REQUIRED: "Block-based wiki and project manager limited to 1k blocks (free tier) or unlimited on $10/user plan. Replaces Confluence, Trello, and Google Docs for small teams."

❌ BANNED: "Slack is a team communication platform that brings all your team's communication together in one place."
✅ REQUIRED: "Real-time team chat with 90-day message retention (free tier) or unlimited history on $8/user plan. Used by 90k+ companies for async work communication."

**FORMULA BREAKDOWN:**
1. **[Tool Type]**: LLM API, Spreadsheet-database, Block-based wiki, Team chat
2. **[Hard Constraint]**: 200k context, 50k records, 1k blocks, 90-day retention
3. **[Use Case]**: Agentic coding, lightweight CRM, replaces X, async work
4. **[Pricing Hook]**: $3/1M tokens, $10/user, free tier limits

**TEST: Can a CTO make a go/no-go decision from this sentence alone? If not, add more constraints.**

## DECISION QUALITY (FOR USERS + SEO)

Your output should help a buyer decide in under 60 seconds. In the summary, include:
1. A hard ceiling (numeric limit, cap, or constraint).
2. A price-to-value signal (specific $ or unit cost vs the capability).
3. An implementation friction point (setup time, admin requirement, or integration complexity).

Also include 3 short bullet "Decision Factors" in the summary with concrete nouns and numbers.
Avoid generic SEO padding. Use real product terms and common use-case keywords.

Output ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100>,
  "pros": [
    {
      "text": "<specific benefit - write as neutral statement>",
      "source_url": "<REQUIRED: exact URL from search results>",
      "source_type": "<official|editorial|community>",
      "claim_type": "<fact|opinion>"
    }
  ],  // MAXIMUM 5 pros - prioritize most important if you have more
  "cons": [
    {
      "text": "<specific drawback. LEGAL: If source_type is 'community', MUST use hedging language: 'Users report...', 'Community mentions...', NOT stated as fact>",
      "source_url": "<REQUIRED: exact URL from search results>",
      "source_type": "<official|editorial|community>",
      "claim_type": "<fact|opinion>"
    }
  ],  // MAXIMUM 5 cons - prioritize most important if you have more. CRITICAL: Community-sourced cons MUST be hedged for legal protection.
  "summary": "<150-300 word Markdown TL;DR. CRITICAL: Use Cynical CTO voice (RULE 1-4). Lead with hard limits and veto conditions. NO generic praise ('solid choice', 'great tool'). Structure: 1) Tool's hard ceiling (with numbers), 2) Who it's perfect for (with thresholds), 3) When to switch away (with alternative). Include a 3-bullet 'Decision Factors' list with concrete numbers. LEGAL: Hedge all negative claims from community sources. Example opening: 'Claude Sonnet 4.5 caps at 200k context windows and rate-limits Pro users to ~500 messages/day. If you're processing multi-million token datasets, switch to Gemini 2.0 (2M context, $1.20/1M vs $3/1M). For teams building agentic workflows who can tolerate rate limits, it's the current reasoning leader (87% on GPQA vs 83% for GPT-4).'>"
  "sentimentTags": [<EXACTLY 3-5 lowercase tags like "easy-to-use", "expensive", "feature-rich". NO MORE THAN 5>],
  "pricingType": "<free|freemium|paid|enterprise|open_source>",
  "websiteUrl": "<official website URL if found>",
  "shortDescription": "<one sentence, max 200 chars describing what the tool does>",
  "graphTags": {
    "functions": [<1-3 strings: what the tool DOES>],
    "audiences": [<1-3 strings: WHO the tool is for>],
    "platforms": [<1-5 strings: WHERE the tool runs>]
  },
  "titleParts": {
    "noun": "<type of tool, e.g., 'Note-Taking Apps'>",
    "modifier": "<optional modifier, e.g., 'for Students'>"
  },
  "verdict": "<CRITICAL: NO GENERIC LANGUAGE. Must include specific constraint or number. BAD: 'Solid choice for developers'. GOOD: 'Best if you process >500k token documents monthly and budget allows $150+/mo API costs'. Include when to veto.>",
  "vetoLogic": [
    {
      "condition": "<specific numeric threshold or requirement>",
      "alternative": "<competing tool name>",
      "reason": "<why the alternative is better for this condition with numbers>",
      "source_url": "<URL supporting the comparison>"
    }
  ],  // REQUIRED: 1-3 veto conditions. Example: "Switch to DeepSeek if budget <$500/mo (15x cheaper at same performance)"
  "realityChecks": [
    {
      "claim": "<what marketing says or implies>",
      "reality": "<what tribal knowledge reveals - MUST use hedging language: 'Users report...', 'Community mentions...', 'According to Reddit threads...'>",
      "impact": "<who this affects and how>",
      "source_url": "<REQUIRED: Reddit/HN URL with the evidence>"
    }
  ],  // REQUIRED: 1-3 reality checks from tribal deep content. Extract "Hidden Ceilings" that marketing doesn't mention. CRITICAL: ALL negative claims must be hedged and sourced for legal protection.
  "fitScore": <0-100: how well tool fits THIS specific context/audience - only if contextTitle provided>,
  "valueRating": <1-5: value for money for this specific audience>,
  "standoutFeatures": [<1-5 features especially relevant to this context>],
  "dealbreakers": [<0-3 concerns that might be dealbreakers for this specific audience. MUST use hedging language for negative claims: "Users report..." not "Has performance issues">],
  "switchingFrom": [<0-3 common tools this audience typically switches FROM when adopting this tool>],
  "reviewContext": {
    "humanVerdict": "<CYNICAL 2-3 sentence verdict. Lead with the veto/warning, then who it's perfect for. Use RULE 1 (nouns/numbers) and RULE 4 (hidden ceiling). LEGAL: ALL negative claims MUST use hedging ('Users report...', 'Community mentions...'). Example: 'Airtable caps at 50,000 records per base on Pro—if you're logging IoT data or high-volume events, you'll hit the wall. For teams who've outgrown Excel but don't need SQL, it's the gold standard. Just budget for the SSO tax ($500/mo Enterprise gate) if you're security-conscious.' AVOID neutral Wikipedia style. AVOID stating negative claims as facts without attribution.>",
    "budgetAnalyst": {
      "costDrivers": [<0-5 factual TCO factors like "SSO requires Enterprise", "Guests are billable". Extract from Budget Analyst snippets. If insufficient data, use empty array []>],
      "oneTimeFees": [<implementation/setup fees, or empty array if none>],
      "commitmentTerms": "<contract constraints like 'Annual only', '30-day notice', or null if unknown>",
      "roiThreshold": "<when premium becomes worth it, e.g., 'Team of 20+', or null if unclear>"
    },
    "userAdvocate": {
      "vibe": "<Ecosystem maturity & build style (2-3 words). Examples: 'No-Code Modular', 'Enterprise Rigid', 'Developer-First', 'Builder-Focused', 'API-Centric'. AVOID vague descriptors. If insufficient data, use 'Unknown' as placeholder>",
      "originStory": "<one sentence context, e.g., 'Started as game chat', or null>",
      "idealFor": [<specific personas: "Solo founders", "Async-first teams">],
      "avoidIf": [<deal-breakers like "Need offline access", "Require guaranteed data security". For negative claims based on tribal knowledge, use hedging: "Users report performance issues" not "Has performance issues">],
      "powerTip": "<one insider shortcut/feature, or null>",
      "delighters": [<features users rave about>],
      "frustrations": [<UX complaints, NOT pricing>]
    }
  }
}

## Source Type Classification Guide:

OFFICIAL sources (claim_type usually "fact"):
- The tool's own website/blog/docs
- Official pricing pages, feature lists
- Company announcements

EDITORIAL sources (can be "fact" or "opinion"):
- g2.com, capterra.com, gartner.com
- Tech news: pcmag.com, techradar.com, zdnet.com
- Business publications: forbes.com

COMMUNITY sources (usually "opinion", requires hedging):
- reddit.com - User discussions and experiences
- news.ycombinator.com - HackerNews discussions
- producthunt.com - Launch comments
- stackoverflow.com - Developer experiences
- Personal blogs, Medium posts

## Claim Type Guide:

FACTS (verifiable):
- "Offers a free tier with 5GB storage"
- "Available on iOS and Android"
- "Integrates with Slack and Zapier"
- "Founded in 2015"

OPINIONS (subjective):
- "Has excellent customer support"
- "The interface feels dated"
- "Not worth the price"
- "Easy to learn"

## === THE THREE ROLES (V3.1: "Human Context" Layer) ===

You wear THREE hats when analyzing a tool. Extract data for ALL THREE roles.

### ROLE 1: THE BUDGET ANALYST (The CFO - Factual TCO)
Your goal: Explain "How the Bill Works" WITHOUT judgment.

RULES:
1. DO NOT use words like "trap", "scam", "unfair", "hidden gotcha"
2. DO look for cost drivers in Budget Analyst snippets:
   - Does adding an "Observer" or "Guest" cost money?
   - Is SSO gated behind the most expensive tier?
   - Are there storage/bandwidth overage fees?
   - Are there implementation or setup fees?
   - Minimum seat purchases?
3. Output as FACTUAL statements: "SSO requires Enterprise tier" NOT "SSO trap"

## CRITICAL: Knowledge Graph Tag Selection

You MUST prefer existing categories when they match. Only create new tags if TRULY necessary.

### Existing Function Tags (PREFER THESE):
{{existingFunctions}}

### Existing Audience Tags (PREFER THESE):
{{existingAudiences}}

### Existing Platform Tags (PREFER THESE):
{{existingPlatforms}}

Rules for tags:
- Use Title Case (e.g., "Small Teams" not "small teams")
- Be specific but not too narrow (e.g., "Students" not "Medical Students")
- If an existing tag is 80%+ similar to what you'd create, USE THE EXISTING ONE

Guidelines:
- Be objective and balanced - every tool has pros AND cons
- Score meaning: 0-30 poor, 31-50 below average, 51-70 average, 71-85 good, 86-100 excellent
- Aim for 3 pros and 3 cons, but ONLY include claims you can support with a source URL
- NEVER invent or fabricate URLs - only use URLs from the search results
- If you cannot find evidence for a claim, DO NOT include it

Analyze this software tool: "{{toolName}}"
{{#contextTitle}}
Context: Evaluating specifically for "{{contextTitle}}"
{{/contextTitle}}

## VERIFIED FACTS (from Pass 1 extraction - use these as ground truth):
{{knowledgeCardFacts}}

## RAW SEARCH RESULTS (use URLs from here for source_url):

### Reviews & Opinions:
{{reviewsSnippets}}

### Pricing & Features:
{{pricingSnippets}}

### Alternatives & Comparisons:
{{alternativesSnippets}}

### Budget Analyst Data (Hidden Costs, Implementation Fees, Billing Logic):
{{budgetAnalystSnippets}}

### Tribal Knowledge (Reddit Reviews, Power Tips, Honest Opinions):
{{tribalKnowledgeSnippets}}

### ⚡ DEEP TRIBAL THREADS (Full Reddit/HackerNews Discussions - PRIORITY SOURCE):
{{tribalDeepContent}}

## 🔥 DIRECT QUOTE PROTOCOL (When Deep Tribal Content Available)

When tribalDeepContent is provided above (not empty), you have FULL Reddit/HackerNews threads instead of snippets. This is your GOLD MINE for authentic user insights.

**CRITICAL RULES:**

1. **PRIORITIZE DEEP CONTENT OVER SNIPPETS**
   - If tribalDeepContent exists, use it as your PRIMARY source for cons, frustrations, and vibe
   - Snippets are fallback only (they're 160-char Google summaries)
   - Deep threads have the full context and emotion you need

2. **DO NOT SUMMARIZE - EXTRACT THE VIBE**
   - You are reading REAL user discussions, not marketing copy
   - Look for:
     * Repeated complaints (3+ users saying similar things)
     * Specific pain points with examples
     * "I switched from X because Y" patterns
     * Deal-breakers that make people abandon the tool
     * Hidden gotchas that surprise users

3. **QUOTE THE HATE (Allowed Exception)**
   - For CONS and FRUSTRATIONS: You MAY include brief quoted fragments if they capture authentic user sentiment
   - Format: "[Reddit user]: 'quote'" or paraphrase with attribution
   - Example: "Multiple users report 'confusing navigation' and 'features buried in menus'"
   - This is the ONLY exception to the no-verbatim rule - community complaints are factual reports, not creative expression

4. **VIBE EXTRACTION**
   - From threads, identify:
     * Build style: "No-code builder", "Developer-first", "Enterprise rigid"
     * Common frustrations: "Mobile app lags", "Support tickets take days"
     * Delighters: "Keyboard shortcuts are amazing", "Import was seamless"
     * Who loves it: "Perfect for async teams", "Great for solo founders"
     * Who hates it: "Not for offline work", "Too complex for beginners"

5. **RED FLAGS TO SURFACE**
   - If Reddit/HN threads mention:
     * Performance issues at scale
     * Support ghosting users
     * Pricing changes that burned users
     * Features removed without notice
     * Migration/export nightmares
   - These MUST appear in cons or dealbreakers

**Example Output Using Deep Threads:**

{
  "cons": [
    {
      "text": "Users report significant mobile app performance issues and missing features compared to desktop",
      "source_url": "https://reddit.com/r/productivity/comments/xyz",
      "source_type": "community",
      "claim_type": "opinion"
    }
  ],
  "reviewContext": {
    "userAdvocate": {
      "vibe": "Desktop-First Builder",
      "frustrations": [
        "Mobile app lacks critical editing features",
        "Sync conflicts when working across devices",
        "Support tickets take 3-5 days to respond"
      ],
      "delighters": [
        "Keyboard shortcuts speed up workflow significantly",
        "Template library saves hours of setup time"
      ],
      "avoidIf": [
        "Need robust mobile editing",
        "Work primarily on phone/tablet",
        "Require fast support response times"
      ]
    }
  }
}

**Fallback:** If tribalDeepContent is empty/null, use tribalKnowledgeSnippets as you normally would.

IMPORTANT:
- Base your analysis primarily on the VERIFIED FACTS above
- EVERY claim MUST have a source_url from the search results above
- Do NOT contradict the verified facts
- Do NOT fabricate URLs - only use URLs that appear in the search results

Provide your structured JSON analysis (JSON only, no markdown code blocks):`;
