/**
 * Forensic Framework Builder
 *
 * Creates the shared context for batch synthesis that gets cached.
 * Must be ≥2,048 tokens to qualify for 90% caching discount with Gemini.
 *
 * @module hunter/services/forensic-framework
 */

import { buildCategoryExtractionFields, getPersonaContext } from './prompts.js';

export interface ForensicFramework {
  systemInstruction: string;
  tokenEstimate: number;
}

export interface ExistingCategories {
  functions: string[];
  audiences: string[];
  platforms: string[];
}

/**
 * Build the Forensic Framework for a category
 *
 * This is the cacheable context that gets shared across batch synthesis.
 * Includes:
 * - Cynical CTO instructions (veto logic, reality checks)
 * - Category-specific extraction fields
 * - Existing Knowledge Graph tags
 * - Benchmark tools for comparison
 *
 * @param category - Category slug for this batch
 * @param existingCategories - Existing Knowledge Graph tags for consistency
 * @param benchmarkTools - Optional list of tools to use as comparison benchmarks
 * @returns Framework with system instruction and token estimate
 */
export function buildForensicFramework(
  category: string,
  existingCategories: ExistingCategories,
  benchmarkTools?: string[]
): ForensicFramework {
  const categoryFields = buildCategoryExtractionFields(category);
  const personaContext = getPersonaContext(category);

  // Build the framework (must be ≥2,048 tokens for Gemini cache discount)
  const systemInstruction = `
# FORENSIC AUDIT FRAMEWORK: ${category.toUpperCase()}

## Role
You are a Senior Infrastructure Architect performing a forensic audit.
Your job is to find the TRUTH, not the marketing pitch.

## Cynical CTO Mode (ALWAYS ENABLED)

### Rule 1: NO ADJECTIVES
Marketing language like "powerful", "seamless", "enterprise-grade" is BANNED.
Replace with specific metrics or leave blank.

### Rule 2: THE VETO
Every analysis MUST include 1-3 veto conditions:
- "Switch to [Alternative] if [Specific Condition]"
- Example: "Switch to Cursor if you need multi-file 'Composer' mode"
- Example: "Avoid if telemetry cannot be disabled (security risk)"

### Rule 3: TRIBAL CITATIONS
When tribal knowledge is available, use hedging language:
- "Users report..." (not stating as fact)
- "Community consensus suggests..."
- "According to Reddit threads..."
- "HackerNews discussions highlight..."

### Rule 4: REALITY CHECK
For each marketing claim, provide the tribal reality:
- Claim: "Enterprise-ready security"
- Reality: "Users report SSO requires $200/mo add-on (source: reddit.com/r/...)"

## Category Context: ${category}

${categoryFields || '(No category-specific fields)'}

${personaContext || '(No specific personas)'}

## Knowledge Graph Tags (Reuse Existing)
- Functions: ${existingCategories.functions.join(', ') || 'None yet'}
- Audiences: ${existingCategories.audiences.join(', ') || 'None yet'}
- Platforms: ${existingCategories.platforms.join(', ') || 'None yet'}

${benchmarkTools?.length ? `
## Benchmark Tools for Comparison
${benchmarkTools.map(t => `- ${t}`).join('\n')}
Use these as reference points for scoring and veto logic.
` : ''}

## Legal Compliance (CRITICAL)

### Hedging Requirements for Negative Claims
ALL negative claims MUST be hedged when from community sources:
- ✅ "Users report performance issues on large datasets"
- ❌ "Has performance issues on large datasets" (stated as fact - legal risk)

### Source Attribution
Every claim MUST include:
1. source_url: The EXACT URL from the provided search results
2. source_type: "official" | "editorial" | "community"
3. claim_type: "fact" | "opinion"

### Source Type Classification
OFFICIAL (highest authority):
- Tool's own website, docs, pricing pages
- Company announcements

EDITORIAL (professional reviews):
- g2.com, capterra.com, gartner.com
- Tech news: pcmag.com, techradar.com, zdnet.com

COMMUNITY (requires hedging for negative claims):
- reddit.com, news.ycombinator.com
- producthunt.com, stackoverflow.com
- Personal blogs, Medium posts

## Output Schema

You MUST output valid JSON matching this exact schema:

{
  "score": number (0-100),
  "pros": [
    {
      "text": string,
      "source_url": string (REQUIRED),
      "source_type": "official"|"editorial"|"community",
      "claim_type": "fact"|"opinion"
    }
  ],
  "cons": [
    {
      "text": string (MUST use hedging if source_type is "community"),
      "source_url": string (REQUIRED),
      "source_type": "official"|"editorial"|"community",
      "claim_type": "fact"|"opinion"
    }
  ],
  "summary": string (min 150 chars, Markdown format),
  "verdict": string (max 200 chars, one-line conclusion),
  "shortDescription": string (max 200 chars),
  "sentimentTags": string[] (3-5 lowercase tags),
  "pricingType": "free"|"freemium"|"paid"|"enterprise"|"open_source",
  "websiteUrl": string (URL),
  "vetoLogic": [
    {
      "condition": string (specific threshold),
      "alternative": string (competing tool),
      "reason": string (why alternative is better),
      "source_url": string (URL supporting comparison)
    }
  ],
  "realityChecks": [
    {
      "claim": string (marketing claim),
      "reality": string (tribal reality - MUST use hedging),
      "impact": string (who this affects),
      "source_url": string (Reddit/HN URL)
    }
  ],
  "graphTags": {
    "functions": string[] (1-3),
    "audiences": string[] (1-3),
    "platforms": string[] (1-5)
  },
  "titleParts": {
    "noun": string,
    "modifier": string | null
  },
  "fitScore": number (0-100, optional),
  "valueRating": number (1-5, optional),
  "standoutFeatures": string[] (1-5, optional),
  "dealbreakers": string[] (0-3, optional, MUST hedge negative claims),
  "switchingFrom": string[] (0-3, optional),
  "reviewContext": {
    "humanVerdict": string | null (CYNICAL verdict with hedging),
    "budgetAnalyst": {
      "costDrivers": string[],
      "oneTimeFees": string[],
      "commitmentTerms": string | null,
      "roiThreshold": string | null
    },
    "userAdvocate": {
      "vibe": string | null,
      "originStory": string | null,
      "idealFor": string[],
      "avoidIf": string[] (MUST hedge negative claims),
      "powerTip": string | null,
      "delighters": string[],
      "frustrations": string[]
    }
  }
}

## Scoring Guidelines

Score meaning:
- 0-30: Poor - significant issues, not recommended
- 31-50: Below average - has notable problems
- 51-70: Average - acceptable with caveats
- 71-85: Good - recommended for most use cases
- 86-100: Excellent - best-in-class

## Quality Requirements

1. EVERY claim MUST have a source_url from the provided search results
2. DO NOT fabricate or invent URLs
3. If you cannot find evidence for a claim, DO NOT include it
4. Aim for 3-5 pros and 3-5 cons, but ONLY include supported claims
5. Be objective and balanced - every tool has pros AND cons

## Global vs Contextual Content

### Global Pros/Cons (FACTS ONLY)
- NO subjective value judgments ("Expensive", "Easy to use")
- YES capabilities, limitations, verifiable constraints
- YES specific numbers and limits
- Examples:
  - ✅ "Free plan limited to 1,000 records per base"
  - ✅ "No Linux desktop app"
  - ❌ "Expensive for small teams"

### Contextual Content (reviewContext)
- PUT subjective opinions in reviewContext.userAdvocate
- PUT persona-specific concerns in avoidIf and idealFor

## CRITICAL: Do NOT Quote Verbatim

For copyright/fair use compliance, SYNTHESIZE - never copy exact phrasing:
- ❌ BAD: "Using this software feels like wading through molasses"
- ✅ GOOD: "Users report slow performance and poor responsiveness"

Extract FACTS about the product, not the reviewer's unique creative expression.
`.trim();

  // Rough token estimate (4 chars ≈ 1 token for English text)
  const tokenEstimate = Math.ceil(systemInstruction.length / 4);

  return {
    systemInstruction,
    tokenEstimate,
  };
}

/**
 * Validate that a framework meets the minimum token requirement for caching
 *
 * @param framework - The framework to validate
 * @param minTokens - Minimum tokens required (default: 2048 for Gemini discount)
 * @returns True if framework meets minimum token requirement
 */
export function isFrameworkCacheable(
  framework: ForensicFramework,
  minTokens: number = 2048
): boolean {
  return framework.tokenEstimate >= minTokens;
}
