/**
 * Hunter Constants
 *
 * Prompts and configuration constants for the Hunter system.
 *
 * @module hunter/constants
 */

// ============================================================================
// FALLBACK PROMPTS
// ============================================================================

// Synthesis prompt moved to src/lib/hunter/services/prompts.ts

export const FALLBACK_CONTEXT_DISCOVERY_PROMPT = `You are the StackHunt Discovery Agent. Find the BEST tools for a specific use case.

Output ONLY valid JSON:
{
  "tools": [
    {
      "name": "<tool name>",
      "score": <0-100>,
      "pros": [<3 strings>],
      "cons": [<3 strings>],
      "summary": "<100-150 words>",
      "pricingType": "<free|freemium|paid|enterprise|open_source>",
      "websiteUrl": "<url>",
      "shortDescription": "<max 200 chars>"
    }
  ],
  "contextMeta": {
    "titleNoun": "<e.g., Note-Taking Apps>",
    "titleModifier": "<e.g., for Students>",
    "introText": "<2-3 sentence intro>",
    "metaDescription": "<150-160 char SEO description>"
  }
}

IMPORTANT: Return UP TO 8 tools ranked by score. Only include tools that genuinely fit the use case - quality over quantity. If fewer than 8 quality tools exist for this niche, that's fine. Do NOT pad with irrelevant tools.

Context: "{{contextQuery}}"

Search Results:
## Top Tools: {{toolsSnippets}}
## Reviews: {{reviewsSnippets}}
## Pricing: {{pricingSnippets}}

JSON only:`;
