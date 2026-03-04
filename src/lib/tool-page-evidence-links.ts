export interface ToolPageEvidenceLinkEntry {
  url: string;
  title: string;
  domain: string;
  basis: string;
  quality: 'high' | 'medium' | 'low';
  inclusionReason: string;
  sourceType: string;
}

export interface ToolPageEvidenceBasisCount {
  label: string;
  count: number;
}

export interface BuildToolPageEvidenceLinksResult {
  evidenceLinksAll: ToolPageEvidenceLinkEntry[];
  evidenceLinks: ToolPageEvidenceLinkEntry[];
  lowConfidenceEvidenceLinks: ToolPageEvidenceLinkEntry[];
  evidenceBasis: ToolPageEvidenceBasisCount[];
  officialEvidenceLinks: ToolPageEvidenceLinkEntry[];
}

const TRUSTED_INDEPENDENT_DOMAINS = new Set([
  'techcrunch.com',
  'theverge.com',
  'wired.com',
  'bloomberg.com',
  'wsj.com',
  'ft.com',
  'reuters.com',
  'forbes.com',
  'crunchbase.com',
  'github.com',
]);

function hasToolNameSignal(toolName: string, value: string): boolean {
  const toolNameTokens = toolName
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
  const lower = value.toLowerCase();
  return toolNameTokens.length > 0 && toolNameTokens.some((token) => lower.includes(token));
}

export function buildToolPageEvidenceLinks(
  sources: Array<Record<string, unknown> | null | undefined>,
  toolName: string
): BuildToolPageEvidenceLinksResult {
  const evidenceLinksAll = sources
    .map((source) => {
      const url = typeof source?.url === 'string' ? source.url : null;
      if (!url) return null;
      let hostname = '';
      try {
        hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return null;
      }
      const path = (() => {
        try {
          return new URL(url).pathname.toLowerCase();
        } catch {
          return '';
        }
      })();
      const blocked =
        hostname.includes('reddit.com') ||
        hostname.includes('ycombinator.com') ||
        hostname.includes('g2.com') ||
        hostname.includes('capterra.com') ||
        hostname.includes('trustpilot.com') ||
        hostname.includes('stackexchange.com') ||
        hostname.includes('stackoverflow.com');
      if (blocked) return null;
      const sourceType = String(source?.source_type || source?.type || '').toLowerCase();
      const basis =
        sourceType === 'official'
          ? hostname.startsWith('status.') || path.includes('/status')
            ? 'Official status pages'
            : path.includes('/pricing') || path.includes('/plans') || path.includes('/subscription')
              ? 'Official pricing pages'
              : path.includes('/changelog') || path.includes('/release') || path.includes('/updates')
                ? 'Official changelogs'
                : 'Official docs/help center'
          : sourceType === 'community'
            ? 'Community discussions'
            : hostname.includes('github.com') && path.includes('/issues')
              ? 'GitHub issues'
              : 'Independent reviews';
      const title =
        typeof source?.title === 'string' && source.title.trim().length > 0
          ? source.title.trim()
          : hostname;
      const toolSignal = hasToolNameSignal(toolName, `${title} ${hostname} ${path}`);
      const isLikelyOffTopicOfficial = sourceType === 'official' && path.includes('/blog/') && !toolSignal;
      let quality: ToolPageEvidenceLinkEntry['quality'] = 'medium';
      let inclusionReason = 'Secondary source';
      if (sourceType === 'official') {
        if (isLikelyOffTopicOfficial) {
          quality = 'low';
          inclusionReason = 'Official domain but page appears unrelated to this tool';
        } else if (
          path.includes('/pricing') ||
          path.includes('/plans') ||
          path.includes('/docs') ||
          path.includes('/help') ||
          path.includes('/developers') ||
          path.includes('/api')
        ) {
          quality = 'high';
          inclusionReason = 'Official product documentation or pricing page';
        } else {
          quality = toolSignal ? 'high' : 'medium';
          inclusionReason = toolSignal
            ? 'Official source with tool-specific signal'
            : 'Official source with weak tool-specific signal';
        }
      } else if (basis === 'Community discussions' || hostname.includes('youtube.com')) {
        quality = 'low';
        inclusionReason = 'Community or user-generated source (anecdotal)';
      } else if (
        TRUSTED_INDEPENDENT_DOMAINS.has(hostname) ||
        Array.from(TRUSTED_INDEPENDENT_DOMAINS).some((domain) => hostname.endsWith(`.${domain}`))
      ) {
        quality = 'medium';
        inclusionReason = 'Independent source from a higher-trust publication';
      } else {
        quality = 'low';
        inclusionReason = 'Low-confidence independent source';
      }
      return {
        url,
        title,
        domain: hostname,
        basis,
        quality,
        inclusionReason,
        sourceType,
      } satisfies ToolPageEvidenceLinkEntry;
    })
    .filter((entry): entry is ToolPageEvidenceLinkEntry => Boolean(entry));

  const evidenceLinks = evidenceLinksAll.filter((entry) => entry.quality !== 'low');
  const lowConfidenceEvidenceLinks = evidenceLinksAll.filter((entry) => entry.quality === 'low');
  const evidenceBasis = [
    'Official docs/help center',
    'Official pricing pages',
    'Official changelogs',
    'Official status pages',
    'Independent reviews',
    'Community discussions',
    'GitHub issues',
  ]
    .map((label) => {
      const domains = new Set(
        evidenceLinks.filter((entry) => entry.basis === label).map((entry) => entry.domain)
      );
      return { label, count: domains.size };
    })
    .filter((entry) => entry.count > 0);
  const officialEvidenceLinks = evidenceLinks.filter((entry) => entry.basis.startsWith('Official'));

  return {
    evidenceLinksAll,
    evidenceLinks,
    lowConfidenceEvidenceLinks,
    evidenceBasis,
    officialEvidenceLinks,
  };
}
