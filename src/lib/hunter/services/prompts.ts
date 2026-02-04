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
      "text": "<specific drawback - write as neutral statement>",
      "source_url": "<REQUIRED: exact URL from search results>",
      "source_type": "<official|editorial|community>",
      "claim_type": "<fact|opinion>"
    }
  ],  // MAXIMUM 5 cons - prioritize most important if you have more
  "summary": "<150-300 word Markdown summary explaining who this tool is best for and why people might switch away>",
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
  "verdict": "<one-line conclusion, max 200 chars, e.g., 'Best for teams who need real-time collaboration'>",
  "fitScore": <0-100: how well tool fits THIS specific context/audience - only if contextTitle provided>,
  "valueRating": <1-5: value for money for this specific audience>,
  "standoutFeatures": [<1-5 features especially relevant to this context>],
  "dealbreakers": [<0-3 concerns that might be dealbreakers for this specific audience>],
  "switchingFrom": [<0-3 common tools this audience typically switches FROM when adopting this tool>],
  "reviewContext": {
    "humanVerdict": "<2-sentence summary in 'Coffee Shop Speak' - NO jargon like 'seamless', 'empowers', 'robust'>",
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
      "avoidIf": [<deal-breakers: "Need offline access", "Hate keyboard shortcuts">],
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

IMPORTANT:
- Base your analysis primarily on the VERIFIED FACTS above
- EVERY claim MUST have a source_url from the search results above
- Do NOT contradict the verified facts
- Do NOT fabricate URLs - only use URLs that appear in the search results

Provide your structured JSON analysis (JSON only, no markdown code blocks):`;
