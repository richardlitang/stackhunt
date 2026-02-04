/**
 * Gemini-Powered Defunct Tool Detector
 *
 * Analyzes search results to determine if a tool has shut down.
 * Prevents wasting API credits on defunct tools.
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { DefunctStatusSchema } from '../types';

export interface DefunctStatus {
  isDefunct: boolean;
  confidence: 'high' | 'medium' | 'low';
  shutdownDate?: string;  // YYYY-MM-DD
  reason?: string;
  evidence?: string;
}

const DEFUNCT_DETECTION_PROMPT = `You are analyzing search results to determine if a software tool is still active or has shut down.

Search results will contain snippets from web searches about the tool. Analyze these to determine:
1. Is the tool still operational?
2. If defunct, when did it shut down?
3. What was the reason (acquired, discontinued, merged)?

INDICATORS OF DEFUNCT STATUS:
- "shut down", "discontinued", "no longer available"
- "service ended", "ceased operations", "closed down"
- "acquired and closed", "merged into", "sunset"
- Official announcements of closure
- Domain expired or redirects to acquirer
- "RIP", "obituary", "end of life"

INDICATORS OF ACTIVE STATUS:
- Recent blog posts or product updates
- Active pricing page
- Customer testimonials from recent dates
- Active social media presence
- Job postings for the company

CONFIDENCE LEVELS:
- high: Multiple clear indicators, official announcements
- medium: Some indicators but not definitive
- low: Unclear or conflicting signals

Output ONLY valid JSON:
{
  "isDefunct": <boolean>,
  "confidence": "high|medium|low",
  "shutdownDate": "YYYY-MM-DD or null",
  "reason": "brief reason or null",
  "evidence": "quote from search results or null"
}

Tool name: {{toolName}}

Search results:
{{searchResults}}`;

export async function detectDefunctTool(
  toolName: string,
  searchResults: string[]
): Promise<DefunctStatus> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenAI({ apiKey });

  // Use first 10 search result snippets
  const snippets = searchResults.slice(0, 10).join('\n\n');

  const prompt = DEFUNCT_DETECTION_PROMPT
    .replace('{{toolName}}', toolName)
    .replace('{{searchResults}}', snippets);

  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0, // Zero temperature for factual analysis
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW, // Fast/cheap for factual detection
        },
      },
    });
    const text = result.text;
    const parsed = JSON.parse(text);

    // Validate with Zod
    const validated = DefunctStatusSchema.safeParse(parsed);
    if (!validated.success) {
      console.error('[DefunctDetector] Validation failed:', validated.error.issues);
      // On error, assume tool is active (fail safe)
      return {
        isDefunct: false,
        confidence: 'low',
      };
    }

    return validated.data;
  } catch (error) {
    console.error('[DefunctDetector] Error detecting defunct status:', toolName, error);
    // On error, assume tool is active (fail safe)
    return {
      isDefunct: false,
      confidence: 'low',
    };
  }
}

/**
 * Helper to extract search result text from Serper response
 */
export function extractSearchSnippets(serperResults: any[]): string[] {
  const snippets: string[] = [];

  for (const result of serperResults) {
    if (result.snippet) {
      snippets.push(result.snippet);
    }
    if (result.title) {
      snippets.push(result.title);
    }
  }

  return snippets;
}
