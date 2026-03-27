const SUBJECTIVE_OPERATIONAL_PATTERN =
  /\b(best value|worth it|great value|good value|excellent|amazing|love|solid choice)\b/i;
const OPERATIONAL_SIGNAL_PATTERN =
  /\b(\d+|seat|user|team|plan|tier|enterprise|business|sso|api|compliance|usage|volume|monthly|annual|contract|storage|limit|quota|retention|export|import|approval|approvals|automation|permission|permissions|admin|governance|audit)\b/i;
const PRICING_LIKE_VALUE_TERMS =
  /\b(price|pricing|cost|costs|fee|fees|billing|billed|monthly|annual|yearly|enterprise|pro\b|max\b|plan|seat)\b/i;
const UNVERIFIED_QUANT_VALUE =
  /\b\d+\s*x\b|\b\d+\s*-\s*\d+\s*(seconds?|minutes?|hours?|days?)\b|\b\d+(?:\.\d+)?%\b/i;
const SEAT_ACCESS_ABSOLUTE =
  /\bsingle seat\b.*\b(access|includes|provides)\b.*\b(design|dev mode|figjam|slides)\b/i;

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isObjectiveOperationalText(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  if (SUBJECTIVE_OPERATIONAL_PATTERN.test(text)) return false;
  return OPERATIONAL_SIGNAL_PATTERN.test(text);
}

export function isRiskyOperationalNarrative(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text) return false;
  return (
    PRICING_LIKE_VALUE_TERMS.test(text) ||
    UNVERIFIED_QUANT_VALUE.test(text) ||
    SEAT_ACCESS_ABSOLUTE.test(text)
  );
}

export function sanitizeOperationalValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;
    if (SUBJECTIVE_OPERATIONAL_PATTERN.test(text)) return null;
    if (isRiskyOperationalNarrative(text) && !isObjectiveOperationalText(text)) return null;
    return text;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => sanitizeOperationalValue(entry))
      .filter((entry) => entry !== null && entry !== undefined);
    return cleaned.length > 0 ? cleaned : null;
  }
  if (isObjectLike(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const cleaned = sanitizeOperationalValue(entry);
      if (cleaned === null || cleaned === undefined) continue;
      output[key] = cleaned;
    }
    return Object.keys(output).length > 0 ? output : null;
  }
  return value;
}

export function sanitizeOperationalRecord(
  value: Record<string, unknown> | undefined | null
): Record<string, unknown> {
  if (!isObjectLike(value)) return {};
  const cleaned = sanitizeOperationalValue(value);
  return isObjectLike(cleaned) ? cleaned : {};
}
