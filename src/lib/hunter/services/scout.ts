/**
 * Scout Agent - Low-Cost Tool Discovery
 *
 * Extracts tool names and domains from search results without expensive analysis.
 * Used for discovering new tools to hunt in context pages.
 *
 * Guardrail 3: Cheap extraction using Gemini Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DiscoveredTool {
  name: string;
  domain: string;  // e.g., "moz.com"
  confidence: 'high' | 'medium' | 'low';
}

const SCOUT_EXTRACTION_PROMPT = `You are a tool discovery agent for a software review platform.

Given search results about software tools, extract a list of SPECIFIC SOFTWARE TOOLS mentioned.

RULES:
1. Extract ONLY actual software tools (SaaS, desktop apps, platforms)
2. DO NOT extract:
   - Generic categories ("SEO", "Marketing", "CRM")
   - Companies that don't make software ("Google", "Agency", "Consultant")
   - Frameworks or libraries (unless they're standalone tools)
   - Services without software ("Training", "Consulting")
3. For each tool, extract:
   - name: The tool's exact name
   - domain: The website domain (guess from context if not explicit)
   - confidence: high (explicit mention + domain), medium (tool mentioned), low (unclear)

EXAMPLES OF VALID TOOLS:
- { name: "Ahrefs", domain: "ahrefs.com", confidence: "high" }
- { name: "Moz Pro", domain: "moz.com", confidence: "high" }
- { name: "Semrush", domain: "semrush.com", confidence: "high" }

EXAMPLES OF INVALID (DO NOT EXTRACT):
- "SEO" (category)
- "Google" (not a tool, it's a company)
- "Marketing Agency" (service, not software)

Output ONLY valid JSON array:
[
  {
    "name": "ToolName",
    "domain": "example.com",
    "confidence": "high|medium|low"
  }
]

Search query: {{query}}

Search results:
{{results}}`;

export async function discoverTools(
  query: string,
  searchResults: any[]
): Promise<DiscoveredTool[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash', // Cheapest model
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  // Format search results for prompt
  const formattedResults = searchResults
    .map(r => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`)
    .join('\n\n');

  const prompt = SCOUT_EXTRACTION_PROMPT
    .replace('{{query}}', query)
    .replace('{{results}}', formattedResults);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const tools = JSON.parse(text) as DiscoveredTool[];

    // Filter out low confidence results
    return tools.filter(t => t.confidence !== 'low');
  } catch (error) {
    console.error('[Scout] Error discovering tools:', error);
    return [];
  }
}

/**
 * Deduplicate discovered tools against existing database
 * Guardrail 1: Domain-based deduplication (not name-based)
 */
export async function filterNewTools(
  discovered: DiscoveredTool[],
  supabase: any
): Promise<DiscoveredTool[]> {
  if (discovered.length === 0) return [];

  const newTools: DiscoveredTool[] = [];

  for (const tool of discovered) {
    // Check if tool exists by domain (Guardrail 1)
    const { data: existing } = await supabase
      .from('items')
      .select('id, name, website')
      .ilike('website', `%${tool.domain}%`)
      .single();

    if (existing) {
      console.log(`[Scout] ⏭️  ${tool.name} already exists (${existing.name})`);
      continue;
    }

    // Also check by exact name (fallback)
    const { data: existingByName } = await supabase
      .from('items')
      .select('id, name')
      .ilike('name', tool.name)
      .single();

    if (existingByName) {
      console.log(`[Scout] ⏭️  ${tool.name} already exists (by name)`);
      continue;
    }

    newTools.push(tool);
  }

  return newTools;
}

/**
 * Extract domains from Serper search results
 * Helper to improve domain guessing accuracy
 */
export function extractDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
