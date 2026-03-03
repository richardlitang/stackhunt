import { AnalysisSchema, type HunterAnalysis } from '../types.js';
import { sanitizeUrl } from '../../utils/url.js';

type NormalizeOptions = {
  applyClaimFixes?: boolean;
  sanitizeWebsiteUrl?: boolean;
};

function parseJsonFlexible(content: string): any {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const extractedObject =
    firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  const extractedArray =
    firstBracket >= 0 && lastBracket > firstBracket
      ? cleaned.slice(firstBracket, lastBracket + 1)
      : cleaned;

  const candidates = [content, cleaned, extractedObject, extractedArray];
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to parse JSON response');
}

export function normalizeAnalysisResponseObject(
  raw: any,
  options: NormalizeOptions = {}
): Record<string, any> {
  const parsed = raw;
  const applyClaimFixes = options.applyClaimFixes === true;

  if (applyClaimFixes) {
    const validSourceTypes = ['official', 'editorial', 'community'];
    const fixClaim = (claim: unknown) => {
      if (typeof claim === 'object' && claim !== null) {
        const c = claim as Record<string, unknown>;
        if (c.source_type && !validSourceTypes.includes(c.source_type as string)) {
          if (c.source_type === 'fact' || c.source_type === 'opinion') {
            if (!c.claim_type) c.claim_type = c.source_type;
            c.source_type = 'editorial';
          }
        }
        if (!c.claim_type) c.claim_type = 'opinion';
      }
      return claim;
    };
    if (Array.isArray(parsed.pros)) parsed.pros = parsed.pros.map(fixClaim);
    if (Array.isArray(parsed.cons)) parsed.cons = parsed.cons.map(fixClaim);
  }

  if (typeof parsed.verdict === 'string' && parsed.verdict.length > 200) {
    parsed.verdict = parsed.verdict.slice(0, 197) + '...';
  }
  if (typeof parsed.shortDescription === 'string' && parsed.shortDescription.length > 200) {
    parsed.shortDescription = parsed.shortDescription.slice(0, 197) + '...';
  }

  if (!Array.isArray(parsed.sentimentTags)) parsed.sentimentTags = [];
  if (!Array.isArray(parsed.vetoLogic)) parsed.vetoLogic = [];
  if (!Array.isArray(parsed.realityChecks)) parsed.realityChecks = [];
  if (!parsed.graphTags || typeof parsed.graphTags !== 'object') {
    parsed.graphTags = { functions: [], audiences: [], platforms: [] };
  }

  if (options.sanitizeWebsiteUrl) {
    const sanitizedUrl = sanitizeUrl(parsed.websiteUrl);
    if (sanitizedUrl) parsed.websiteUrl = sanitizedUrl;
    else delete parsed.websiteUrl;
  }

  return parsed as Record<string, any>;
}

export function parseAndValidateAnalysisResponse(
  content: string,
  options: NormalizeOptions = {}
): HunterAnalysis {
  const rawParsed = parseJsonFlexible(content);
  const parsed = Array.isArray(rawParsed) ? rawParsed[0] || {} : rawParsed;
  const normalized = normalizeAnalysisResponseObject(parsed, options);
  const validated = AnalysisSchema.parse(normalized);
  return validated as unknown as HunterAnalysis;
}
