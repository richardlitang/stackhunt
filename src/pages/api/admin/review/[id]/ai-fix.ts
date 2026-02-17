/**
 * AI-assisted review patch proposal
 * POST /api/admin/review/[id]/ai-fix
 */

import type { APIRoute } from 'astro';
import { GoogleGenAI } from '@google/genai';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { getGeminiModelForStage } from '@/lib/hunter/services/model-router';
import { generateContentWithThinkingFallback } from '@/lib/hunter/services/gemini-compat';

export const prerender = false;

type SectionScope = 'summary' | 'pros' | 'cons' | 'faq' | 'all';

interface ClaimPatch {
  text: string;
  source_url?: string;
  source_type?: string;
}

interface AiFixRequest {
  section: SectionScope;
  instruction: string;
  current?: {
    summary_markdown?: string;
    pros?: string[];
    cons?: string[];
    faq_json?: string;
  };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function claimText(value: unknown): string {
  if (typeof value === 'string') return normalizeText(value);
  if (value && typeof value === 'object' && typeof (value as { text?: unknown }).text === 'string') {
    return normalizeText((value as { text: string }).text);
  }
  return '';
}

function toClaimPatches(raw: unknown): ClaimPatch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        const text = normalizeText(entry);
        if (!text) return null;
        return { text };
      }
      if (!entry || typeof entry !== 'object') return null;
      const claim = entry as Record<string, unknown>;
      const text = typeof claim.text === 'string' ? normalizeText(claim.text) : '';
      if (!text) return null;
      const source_url =
        typeof claim.source_url === 'string' && claim.source_url.trim()
          ? claim.source_url.trim()
          : undefined;
      const source_type =
        typeof claim.source_type === 'string' && claim.source_type.trim()
          ? claim.source_type.trim()
          : undefined;
      return {
        text,
        ...(source_url ? { source_url } : {}),
        ...(source_type ? { source_type } : {}),
      };
    })
    .filter((claim): claim is ClaimPatch => Boolean(claim))
    .slice(0, 8);
}

function parseJsonResponse(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

export const POST: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return ApiResponse.badRequest('Review ID required');

  try {
    const body = (await request.json()) as AiFixRequest;
    const section = body.section || 'all';
    const instruction = normalizeText(body.instruction || '');

    if (!instruction) return ApiResponse.badRequest('Instruction is required');
    if (!['summary', 'pros', 'cons', 'faq', 'all'].includes(section)) {
      return ApiResponse.badRequest('Invalid section');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return ApiResponse.internalError('GEMINI_API_KEY not configured');

    const admin = getAdminClient();
    const { data: reviewRow, error } = await admin
      .from('reviews')
      .select(
        `
        id,
        summary_markdown,
        pros,
        cons,
        sources,
        tool:tools(name, website, pricing_type, metadata),
        context:contexts(title)
      `
      )
      .eq('id', id)
      .maybeSingle();

    if (error || !reviewRow) return ApiResponse.notFound('Review not found');

    const tool = (reviewRow as any).tool || {};
    const context = (reviewRow as any).context || {};
    const existingFaqs = Array.isArray(tool?.metadata?.faqs) ? tool.metadata.faqs : [];

    const currentSummary = normalizeText(
      body.current?.summary_markdown || reviewRow.summary_markdown || ''
    );
    const currentPros =
      Array.isArray(body.current?.pros) && body.current?.pros.length > 0
        ? body.current?.pros.map(normalizeText).filter(Boolean)
        : (Array.isArray(reviewRow.pros) ? reviewRow.pros.map(claimText).filter(Boolean) : []);
    const currentCons =
      Array.isArray(body.current?.cons) && body.current?.cons.length > 0
        ? body.current?.cons.map(normalizeText).filter(Boolean)
        : (Array.isArray(reviewRow.cons) ? reviewRow.cons.map(claimText).filter(Boolean) : []);

    let currentFaqs: unknown[] = existingFaqs;
    if (typeof body.current?.faq_json === 'string' && body.current.faq_json.trim()) {
      try {
        const parsed = JSON.parse(body.current.faq_json);
        if (Array.isArray(parsed)) currentFaqs = parsed;
      } catch {
        // Ignore invalid client-side JSON; we still have DB fallback.
      }
    }

    const sources = Array.isArray(reviewRow.sources) ? reviewRow.sources.slice(0, 8) : [];

    const prompt = `
You are editing a software review draft for publication quality.
Return ONLY valid JSON.

Task:
- Section scope: ${section}
- Reviewer instruction: ${instruction}

Context:
- Tool: ${tool.name || 'Unknown'}
- Context title: ${context.title || 'N/A'}
- Website: ${tool.website || 'N/A'}
- Pricing type: ${tool.pricing_type || 'N/A'}

Current content:
- summary_markdown: ${JSON.stringify(currentSummary)}
- pros: ${JSON.stringify(currentPros)}
- cons: ${JSON.stringify(currentCons)}
- faq_json: ${JSON.stringify(currentFaqs)}

Evidence sources (authoritative links to prefer):
${JSON.stringify(sources)}

Rules:
1) Preserve factuality and avoid introducing unsupported claims.
2) Keep edits concise and specific.
3) Pros/cons must be actionable and non-generic.
4) If you change a factual pro/con, include source_url when possible.
5) Keep output bounded: max 8 pros, 8 cons, 8 FAQs.
6) If section scope is limited, only change that section and keep other sections unchanged.

Output JSON shape:
{
  "summary_markdown": "string",
  "pros": [{ "text": "string", "source_url": "optional", "source_type": "optional" }],
  "cons": [{ "text": "string", "source_url": "optional", "source_type": "optional" }],
  "faq_json": [{ "question": "string", "answer": "string", "answer_source_url": "optional", "answer_source_type": "optional" }],
  "rationale": "short string",
  "warnings": ["optional strings"]
}
`.trim();

    const client = new GoogleGenAI({ apiKey });
    const model = getGeminiModelForStage('analysis_synthesis');
    const response = await generateContentWithThinkingFallback(client, {
      model,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    if (!text.trim()) return ApiResponse.internalError('AI returned empty response');

    const parsed = parseJsonResponse(text) as Record<string, unknown>;
    const proposal = {
      summary_markdown:
        typeof parsed.summary_markdown === 'string'
          ? parsed.summary_markdown.trim()
          : currentSummary,
      pros: toClaimPatches(parsed.pros),
      cons: toClaimPatches(parsed.cons),
      faq_json: Array.isArray(parsed.faq_json) ? parsed.faq_json.slice(0, 8) : currentFaqs.slice(0, 8),
      rationale:
        typeof parsed.rationale === 'string' && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : 'Updated per reviewer instruction.',
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings
            .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
            .slice(0, 6)
        : [],
    };

    return ApiResponse.ok({ proposal });
  } catch (err) {
    console.error('AI fix error:', err);
    return ApiResponse.internalError('Failed to generate AI patch');
  }
};

