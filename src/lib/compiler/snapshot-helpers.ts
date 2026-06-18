export type ClaimItem =
  | string
  | {
      text?: string;
      source_url?: string;
      source_type?: string;
      domain?: string;
      retrieved_at?: string;
    };

export interface EvidenceRef {
  url: string;
  source_type?: string;
  domain?: string;
  retrieved_at?: string;
}

export function normalizeComparePair(slugA: string, slugB: string) {
  const a = String(slugA || '')
    .trim()
    .toLowerCase();
  const b = String(slugB || '')
    .trim()
    .toLowerCase();
  if (!a || !b) {
    throw new Error('Both comparison slugs are required');
  }
  if (a === b) {
    throw new Error('Comparison requires two different slugs');
  }
  return a < b ? { toolASlug: a, toolBSlug: b } : { toolASlug: b, toolBSlug: a };
}

export function claimText(claim: ClaimItem): string {
  if (typeof claim === 'string') return claim.trim();
  if (!claim || typeof claim !== 'object') return '';
  return typeof claim.text === 'string' ? claim.text.trim() : '';
}

export function toClaimList(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();
  for (const raw of value as ClaimItem[]) {
    const text = claimText(raw);
    if (!text) continue;
    deduped.add(text);
    if (deduped.size >= limit) break;
  }
  return Array.from(deduped);
}

function normalizeDomain(rawDomain: string): string {
  return rawDomain
    .replace(/^www\./i, '')
    .trim()
    .toLowerCase();
}

export function toEvidenceRefs(value: unknown, limit = 3): EvidenceRef[] {
  if (!Array.isArray(value)) return [];
  const refs: EvidenceRef[] = [];
  const deduped = new Set<string>();

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const source = raw as Record<string, unknown>;
    const url = typeof source.url === 'string' ? source.url.trim() : '';
    if (!url || deduped.has(url)) continue;

    let domain = typeof source.domain === 'string' ? source.domain.trim() : '';
    if (!domain && url) {
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = '';
      }
    }

    refs.push({
      url,
      source_type: typeof source.source_type === 'string' ? source.source_type : undefined,
      domain: domain ? normalizeDomain(domain) : undefined,
      retrieved_at: typeof source.retrieved_at === 'string' ? source.retrieved_at : undefined,
    });
    deduped.add(url);

    if (refs.length >= limit) break;
  }

  return refs;
}
