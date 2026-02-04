/**
 * Name Collision Detector
 * 
 * Detects when research data mixes multiple companies with the same name.
 * 
 * Examples:
 * - Aider.chat (CLI coding tool) vs Aider.ai (accounting software)
 * - Notion (productivity) vs Notion (CRM)
 * - Linear (issue tracker) vs Linear (finance)
 */

export interface CollisionWarning {
  detected: boolean;
  primaryDomain: string;
  conflictingDomains: string[];
  conflictingCategories: string[];
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
}

/**
 * Detect if research data contains mixed signals from different companies
 */
export function detectNameCollision(
  toolName: string,
  expectedDomain: string, // From classification or user input
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  extractedCategories: string[], // e.g., ["AI Coding Assistant", "Accounting Automation"]
  expectedCategory?: string // From classification
): CollisionWarning {
  // Extract unique domains from sources
  const domainCounts = new Map<string, number>();
  const domainCategories = new Map<string, Set<string>>();

  for (const source of sources) {
    const count = domainCounts.get(source.domain) || 0;
    domainCounts.set(source.domain, count + 1);

    // Track what categories each domain discusses
    for (const category of extractedCategories) {
      const lowerSnippet = `${source.title} ${source.snippet}`.toLowerCase();
      if (lowerSnippet.includes(category.toLowerCase())) {
        if (!domainCategories.has(source.domain)) {
          domainCategories.set(source.domain, new Set());
        }
        domainCategories.get(source.domain)!.add(category);
      }
    }
  }

  // Get top domains by source count
  const sortedDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([domain]) => domain);

  const primaryDomain = sortedDomains[0] || expectedDomain;

  // Check for conflicting domains
  const conflictingDomains = sortedDomains.filter((domain) => {
    // Ignore subdomains of primary (blog.aider.chat is OK)
    if (domain.includes(primaryDomain) || primaryDomain.includes(domain)) {
      return false;
    }
    // Flag if name is in domain but different TLD/company
    const toolNameInDomain = domain.toLowerCase().includes(toolName.toLowerCase());
    return toolNameInDomain && domainCounts.get(domain)! >= 3; // At least 3 sources
  });

  // Check for category conflicts
  const conflictingCategories: string[] = [];
  if (expectedCategory) {
    const unexpectedCategories = extractedCategories.filter(
      (cat) => !cat.toLowerCase().includes(expectedCategory.toLowerCase())
    );
    if (unexpectedCategories.length > 0) {
      conflictingCategories.push(...unexpectedCategories);
    }
  }

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (conflictingDomains.length > 0 && conflictingCategories.length > 0) {
    confidence = 'high';
  } else if (conflictingDomains.length > 0 || conflictingCategories.length > 0) {
    confidence = 'medium';
  }

  const detected = conflictingDomains.length > 0 || conflictingCategories.length > 0;

  return {
    detected,
    primaryDomain,
    conflictingDomains,
    conflictingCategories,
    confidence,
    recommendation: detected
      ? `Multiple companies named "${toolName}" detected. Review sources to ensure data is from ${primaryDomain} only.`
      : 'No name collision detected.',
  };
}

/**
 * Filter sources to remove data from conflicting domains
 */
export function filterConflictingSources(
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  primaryDomain: string,
  conflictingDomains: string[]
): Array<{ url: string; title: string; snippet: string; domain: string }> {
  return sources.filter((source) => {
    // Keep if from primary domain or subdomain
    if (source.domain.includes(primaryDomain) || primaryDomain.includes(source.domain)) {
      return true;
    }
    // Remove if from conflicting domain
    return !conflictingDomains.some((conflict) => source.domain.includes(conflict));
  });
}
