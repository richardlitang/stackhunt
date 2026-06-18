export interface ToolPageReviewContentLike {
  pros?: unknown;
  cons?: unknown;
  sources?: unknown;
}

export interface ToolPageReviewSourceLike {
  domain?: string;
  url?: string;
}

export interface ToolPageReviewContentLists {
  pros: unknown[];
  cons: unknown[];
  sources: ToolPageReviewSourceLike[];
}

function toUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toSourceLikeArray(value: unknown): ToolPageReviewSourceLike[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is ToolPageReviewSourceLike =>
    Boolean(entry && typeof entry === 'object')
  );
}

export function deriveToolPageReviewContentLists(
  review: ToolPageReviewContentLike | null
): ToolPageReviewContentLists {
  return {
    pros: toUnknownArray(review?.pros),
    cons: toUnknownArray(review?.cons),
    sources: toSourceLikeArray(review?.sources),
  };
}

export function deriveToolPageSourceEvidenceDomains(
  sources: ToolPageReviewSourceLike[]
): Set<string> {
  return new Set(
    sources
      .map((source) => {
        if (source.domain) return source.domain.replace(/^www\./, '').toLowerCase();
        if (!source.url) return null;
        try {
          return new URL(source.url).hostname.replace(/^www\./, '').toLowerCase();
        } catch {
          return null;
        }
      })
      .filter((domain): domain is string => Boolean(domain))
  );
}
