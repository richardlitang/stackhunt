export function normalizeFeatureLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9+\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGenericDifferentiator(value: string): boolean {
  const normalized = normalizeFeatureLabel(value);
  if (!normalized || normalized.length < 6) return true;
  const genericPatterns = [
    /\bai (chat|assistant|automation|generation)\b/,
    /\b(api|integrations?|webhooks?|automation)\b/,
    /\b(data export|export)\b/,
    /\b(collaboration|workflow|productivity)\b/,
    /\b(conversation memory|memory)\b/,
    /\b(code generation)\b/,
  ];
  return genericPatterns.some((pattern) => pattern.test(normalized));
}

export function hasSpecificSignal(value: string): boolean {
  return (
    /\b\d/.test(value) ||
    /\b(pro|max|enterprise|team|business|starter|free)\b/i.test(value) ||
    /\b(scim|sso|dpa|soc 2|hipaa|gdpr|api)\b/i.test(value) ||
    /\b[A-Z]{2,}\b/.test(value)
  );
}

export function featureOverlapRatio(a: string, b: string): number {
  const tokenize = (value: string) =>
    new Set(
      normalizeFeatureLabel(value)
        .split(' ')
        .filter((token) => token.length >= 3)
    );
  const aa = tokenize(a);
  const bb = tokenize(b);
  if (aa.size === 0 || bb.size === 0) return 0;
  let overlap = 0;
  for (const token of aa) {
    if (bb.has(token)) overlap += 1;
  }
  return overlap / aa.size;
}

export function extractNamedFeatures(text: string): string[] {
  const quoted = Array.from(text.matchAll(/["'“”]([^"'“”]{3,80})["'“”]/g)).map((m) => m[1].trim());
  const titleCase = Array.from(
    text.matchAll(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,4})\b/g)
  ).map((m) => m[1].trim());
  const candidates = [...quoted, ...titleCase];
  const deny = new Set(['OpenAI', 'Anthropic', 'Google', 'xAI', 'API', 'Enterprise', 'Pro', 'Max']);
  return Array.from(
    new Set(
      candidates.filter((item) => {
        if (item.length < 4) return false;
        if (deny.has(item)) return false;
        if (/^(The|This|That|These|Those)\b/.test(item)) return false;
        return true;
      })
    )
  );
}

export function overlapRatio(a: string, b: string): number {
  const aw = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 3)
  );
  const bw = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 3)
  );
  if (aw.size === 0 || bw.size === 0) return 0;
  let matches = 0;
  for (const token of aw) {
    if (bw.has(token)) matches++;
  }
  return matches / aw.size;
}

export function tokenizeForSimilarity(input: string): Set<string> {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .filter((token) => !['best', 'for', 'the', 'and', 'with'].includes(token));
  return new Set(normalized);
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}
