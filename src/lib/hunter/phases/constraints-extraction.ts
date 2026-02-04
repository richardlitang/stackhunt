/**
 * Constraints Extraction Phase (Separate from Main Knowledge Card)
 *
 * Extracts hard limits and hidden costs using a focused, lightweight schema
 * that avoids Gemini's complexity limits.
 */

import { GoogleGenerativeAI, type SchemaType } from '@google/generative-ai';
import { ConstraintSchema, HiddenCostSchema, ToolConstraintsSchema } from '../../knowledge-card.js';
import type { ToolConstraints } from '../../knowledge-card.js';

// Simplified Gemini schema for constraints only (no complexity issues)
const GeminiConstraintsSchema = {
  type: 'object' as SchemaType,
  description: 'Hard limits and hidden costs extracted from pricing pages',
  properties: {
    hard_limits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          plan_name_match: { type: 'string', nullable: true },
          type: { type: 'string' },
          value: { type: 'number' },
          consequence: { type: 'string' },
          description: { type: 'string' },
          source_url: { type: 'string' },
          overage: {
            type: 'object',
            nullable: true,
            properties: {
              cost: { type: 'number' },
              unit: { type: 'string' },
              currency: { type: 'string' },
            },
          },
        },
        required: ['type', 'value', 'consequence', 'description'],
      },
    },
    hidden_costs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          cost: { type: 'number', nullable: true },
          currency: { type: 'string' },
          trigger: { type: 'string' },
        },
        required: ['description', 'trigger'],
      },
    },
  },
  required: ['hard_limits', 'hidden_costs'],
};

interface ConstraintsExtractionContext {
  toolName: string;
  pricingPageUrl?: string | null;
  scrapedContent: string; // Pricing page content
  geminiApiKey: string;
}

interface ConstraintsExtractionDeps {
  log: (message: string) => void;
}

/**
 * Extract constraints from pricing page content using Gemini
 */
export async function extractConstraints(
  ctx: ConstraintsExtractionContext,
  deps: ConstraintsExtractionDeps
): Promise<ToolConstraints | null> {
  const { toolName, pricingPageUrl, scrapedContent, geminiApiKey } = ctx;

  if (!scrapedContent || scrapedContent.length < 100) {
    deps.log('[Constraints] ⚠️ Insufficient pricing content, skipping extraction');
    return null;
  }

  const prompt = buildConstraintsPrompt(toolName, pricingPageUrl, scrapedContent);

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: GeminiConstraintsSchema,
      },
    });

    deps.log('[Constraints] Extracting via Gemini...');
    const result = await model.generateContent(prompt);
    const rawJson = result.response.text();
    const parsed = JSON.parse(rawJson);

    // Validate with Zod
    const validated = ToolConstraintsSchema.parse(parsed);

    deps.log(`[Constraints] ✓ Extracted ${validated.hard_limits?.length || 0} limits, ${validated.hidden_costs?.length || 0} hidden costs`);
    return validated;

  } catch (error) {
    deps.log(`[Constraints] ❌ Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * Build focused prompt for constraints extraction
 */
function buildConstraintsPrompt(
  toolName: string,
  pricingPageUrl: string | null | undefined,
  content: string
): string {
  return `You are a "Forensic Accountant" analyzing ${toolName}'s pricing for hard limits and hidden costs.

Your role: Ignore marketing language. Find the "No". Find the limits that will surprise users at scale.

=== EXTRACTION RULES ===

**hard_limits**: Array of constraints with consequences

Constraint Types:
  - record_count: Max records in database
  - storage_gb: Max file storage
  - api_requests_per_month: Monthly API call limit
  - api_rate_limit_per_sec: Requests per second throttle
  - seat_count: Max users/seats
  - project_count: Max projects/workspaces
  - active_contacts: Max contacts in CRM/email tool
  - message_credits: Max messages (chat, SMS, email)

Consequences (what happens when limit is hit):
  - hard_stop: Service stops working
  - soft_throttle: Service slows down
  - auto_charge: Automatically bills credit card
  - upgrade_locked: Must upgrade plan
  - data_deletion: Data gets deleted

**plan_name_match**: Extract the EXACT plan name string (e.g., "Pro", "Business")
  - Set to null if limit applies to ALL plans
  - DO NOT generate plan IDs - just copy the plan name verbatim

**source_url**: Direct link to pricing page, ToS, or docs where limit is documented
  - PREFERRED but not required
  - Fall back to: ${pricingPageUrl || 'pricing page URL'}

**overage**: For auto_charge consequences, extract the overage cost
  - Example: "100GB included, $5/GB overage" → overage: {cost: 5, unit: "per GB", currency: "USD"}

**hidden_costs**: Array of surprise charges
  - Examples: "SSO requires $200/mo add-on", "Implementation fee: $5,000"
  - trigger: When does this cost apply?

EVIDENCE REQUIREMENTS:
- Extract constraints only if you can cite evidence
- If pricing page says "Unlimited" or "No limits" → Do NOT add constraint
- If no limits are documented → Return empty arrays
- If limit exists but consequence is unclear → Use "upgrade_locked" as default

ANTI-PATTERNS (DO NOT EXTRACT):
- Feature gates (e.g., "SSO on Enterprise only") → This is a plan feature, not a constraint
- Soft recommendations (e.g., "Recommended for teams of 5-10") → Not a hard limit
- Vague throttling without specific numbers

=== PRICING CONTENT ===
${content.slice(0, 15000)}

=== OUTPUT ===
Return JSON with hard_limits and hidden_costs arrays. If no constraints found, return empty arrays.`;
}

/**
 * Extract constraints for an existing tool in the database
 */
export async function extractConstraintsForTool(
  toolId: string,
  toolName: string,
  pricingPageUrl: string | null,
  geminiApiKey: string,
  deps: ConstraintsExtractionDeps
): Promise<ToolConstraints | null> {
  // TODO: Fetch and scrape pricing page
  // For now, this is a placeholder that would integrate with existing scraping logic
  deps.log('[Constraints] TODO: Integrate with pricing page scraping');
  return null;
}
