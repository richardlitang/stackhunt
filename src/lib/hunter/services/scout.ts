/**
 * Scout Agent - Low-Cost Tool Discovery
 *
 * Extracts tool names and domains from search results without expensive analysis.
 * Used for discovering new tools to hunt in context pages.
 *
 * Guardrail 3: Cheap extraction using Gemini Flash
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { DiscoveredToolSchema } from '../types';
import { getGeminiModelForStage } from './model-router';
import { generateContentWithThinkingFallback } from './gemini-compat';

export interface DiscoveredTool {
  name: string;
  domain: string; // e.g., "moz.com"
  confidence: 'high' | 'medium' | 'low';
}

interface SearchResultLike {
  title?: string;
  snippet?: string;
  link?: string;
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
   - domain: The website domain (leave empty if not explicit)
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

  const genAI = new GoogleGenAI({ apiKey });
  const model = getGeminiModelForStage('tool_discovery');

  // Format search results for prompt
  const formattedResults = searchResults
    .map((r) => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`)
    .join('\n\n');

  const prompt = SCOUT_EXTRACTION_PROMPT.replace('{{query}}', query).replace(
    '{{results}}',
    formattedResults
  );

  try {
    const result = await generateContentWithThinkingFallback(genAI, {
      model,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Fast tool discovery
        },
      },
    });
    const text = result.text || '[]';
    const parsed = JSON.parse(text);

    // Validate with Zod
    if (!Array.isArray(parsed)) {
      console.error('[Scout] Validation failed: Response is not an array');
      return [];
    }

    const validated = parsed
      .map((item) => {
        const result = DiscoveredToolSchema.safeParse(item);
        if (!result.success) {
          console.error('[Scout] Validation failed for tool:', result.error.issues);
          return null;
        }
        return result.data;
      })
      .filter((t): t is DiscoveredTool => t !== null);

    const resolved = resolveDiscoveredToolDomains(validated, searchResults);

    // Keep only resolvable, non-low-confidence tools
    return resolved.filter((t) => t.confidence !== 'low');
  } catch (error) {
    console.error('[Scout] Error discovering tools:', error);
    return [];
  }
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveDomainFromSearchResults(
  toolName: string,
  searchResults: SearchResultLike[]
): string | null {
  const name = toolName.trim();
  if (!name) return null;
  const exactPattern = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
  const loosePattern = new RegExp(escapeRegex(name), 'i');

  for (const result of searchResults) {
    const haystack = `${result.title || ''} ${result.snippet || ''}`.trim();
    if (!haystack || !result.link) continue;
    if (!exactPattern.test(haystack) && !loosePattern.test(haystack)) continue;
    const resolved = extractDomainFromUrl(result.link);
    if (resolved) return resolved;
  }

  return null;
}

export function resolveDiscoveredToolDomains(
  discovered: DiscoveredTool[],
  searchResults: SearchResultLike[]
): DiscoveredTool[] {
  const dedupedByDomain = new Map<string, DiscoveredTool>();

  for (const tool of discovered) {
    const modelDomain = normalizeDomain(tool.domain || '');
    const resolvedDomain = resolveDomainFromSearchResults(tool.name, searchResults);
    const finalDomain = modelDomain || resolvedDomain || '';
    if (!finalDomain) continue;

    const confidence: DiscoveredTool['confidence'] =
      modelDomain && resolvedDomain && modelDomain === resolvedDomain
        ? 'high'
        : resolvedDomain
          ? 'medium'
          : tool.confidence;

    const existing = dedupedByDomain.get(finalDomain);
    if (!existing || (existing.confidence !== 'high' && confidence === 'high')) {
      dedupedByDomain.set(finalDomain, {
        name: tool.name.trim(),
        domain: finalDomain,
        confidence,
      });
    }
  }

  return Array.from(dedupedByDomain.values());
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
