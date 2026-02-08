/**
 * Constraints Extraction (Standalone)
 *
 * Lightweight Gemini wrapper used by scripts/extract-constraints.ts.
 * Returns hard limits + hidden costs from pricing page content.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ToolConstraintsSchema, type ToolConstraints } from '@/lib/knowledge-card';
import { generateContentWithThinkingFallback } from '@/lib/hunter/services/gemini-compat';

export interface ExtractConstraintsInput {
  toolName: string;
  pricingPageUrl: string;
  scrapedContent: string;
  geminiApiKey: string;
}

export interface ExtractConstraintsDeps {
  log?: (message: string) => void;
}

export async function extractConstraints(
  input: ExtractConstraintsInput,
  deps: ExtractConstraintsDeps = {}
): Promise<ToolConstraints> {
  const { toolName, pricingPageUrl, scrapedContent, geminiApiKey } = input;
  const log = deps.log || (() => {});

  const client = new GoogleGenAI({ apiKey: geminiApiKey });

  const prompt = `
You are a pricing analyst. Extract hard limits and hidden costs from the pricing page content.

Tool: ${toolName}
Pricing page: ${pricingPageUrl}

Return ONLY valid JSON with this shape:
{
  "hard_limits": [
    {
      "plan_name_match": "string or null",
      "type": "record_count|storage_gb|api_requests_per_month|api_rate_limit_per_sec|seat_count|project_count|active_contacts|message_credits",
      "value": number,
      "consequence": "hard_stop|soft_throttle|auto_charge|upgrade_locked|data_deletion",
      "description": "string",
      "source_url": "string (optional)",
      "overage": { "cost": number, "unit": "string", "currency": "USD" } (optional)
    }
  ],
  "hidden_costs": [
    {
      "description": "string",
      "cost": number or null,
      "currency": "USD",
      "trigger": "string"
    }
  ]
}

Rules:
- If no limits/costs are found, return empty arrays.
- Use numeric values only (no ranges).
- Do not hallucinate; only use facts from the content.

Content:
"""${scrapedContent.slice(0, 120_000)}"""
`;

  log('Calling Gemini for constraints extraction...');

  const response = await generateContentWithThinkingFallback(client, {
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });

  const content = response.text;
  if (!content) {
    log('Empty response from Gemini. Returning empty constraints.');
    return { hard_limits: [], hidden_costs: [] };
  }

  const parsed = JSON.parse(content);
  return ToolConstraintsSchema.parse(parsed);
}
