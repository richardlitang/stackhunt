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

  // HYBRID APPROACH: Smart primary domain detection
  let primaryDomain: string;
  const toolNameLower = toolName.toLowerCase();

  // Step 1: Find all domains that match the tool name (e.g., aider.chat, aider.ai)
  const toolDomains = Array.from(domainCounts.entries())
    .filter(([domain]) => {
      const domainLower = domain.toLowerCase();
      // Match if tool name is in domain (but not generic like reddit.com)
      return domainLower.includes(toolNameLower) &&
             !domainLower.includes('reddit') &&
             !domainLower.includes('news.ycombinator');
    })
    .sort((a, b) => b[1] - a[1]); // Sort by source count

  if (expectedDomain && toolDomains.some(([d]) => d === expectedDomain)) {
    // Step 2a: If we have an expected domain and it's in the matches, use it
    primaryDomain = expectedDomain;
  } else if (toolDomains.length === 1) {
    // Step 2b: Only one tool domain found, use it
    primaryDomain = toolDomains[0][0];
  } else if (toolDomains.length > 1 && expectedCategory) {
    // Step 2c: Multiple tool domains found, use category to disambiguate
    // Check which domain appears with the expected category
    const categoryHints: Record<string, string[]> = {
      'dev': ['code', 'developer', 'coding', 'programming', 'git', 'cli'],
      'accounting': ['finance', 'accounting', 'advisory', 'bookkeeping', 'tax'],
      'crm': ['sales', 'customer', 'crm', 'contact'],
    };

    const expectedCatLower = expectedCategory.toLowerCase();
    let bestMatch = toolDomains[0][0]; // Default to most common

    for (const [domain] of toolDomains) {
      const domainSources = sources.filter(s => s.domain === domain);
      const domainText = domainSources.map(s => `${s.title} ${s.snippet}`).join(' ').toLowerCase();

      // Check if domain's sources match expected category hints
      for (const [catType, keywords] of Object.entries(categoryHints)) {
        if (expectedCatLower.includes(catType)) {
          const matchCount = keywords.filter(kw => domainText.includes(kw)).length;
          if (matchCount >= 2) {
            bestMatch = domain;
            break;
          }
        }
      }
    }
    primaryDomain = bestMatch;
  } else if (expectedDomain) {
    // Step 2d: Use expected domain if provided
    primaryDomain = expectedDomain;
  } else {
    // Step 2e: Fallback to most common non-tribal domain
    const sortedDomains = Array.from(domainCounts.entries())
      .filter(([d]) => !d.includes('reddit') && !d.includes('ycombinator'))
      .sort((a, b) => b[1] - a[1]);
    primaryDomain = sortedDomains[0]?.[0] || toolDomains[0]?.[0] || expectedDomain || 'unknown';
  }

  // Step 3: Identify conflicting domains (tool domains that aren't primary)
  const conflictingDomains = toolDomains
    .map(([domain]) => domain)
    .filter((domain) => {
      // Ignore subdomains of primary (blog.aider.chat is OK)
      if (domain.includes(primaryDomain) || primaryDomain.includes(domain)) {
        return false;
      }
      // Flag if it's a different tool domain
      return domain !== primaryDomain && domainCounts.get(domain)! >= 3;
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

/**
 * Post-extraction validation: Verify extracted website matches expected
 * 
 * Run this AFTER Knowledge Card extraction when we have the actual website
 */
export function validateExtractedDomain(
  toolName: string,
  extractedWebsite: string, // From Knowledge Card
  sources: Array<{ url: string; title: string; snippet: string; domain: string }>,
  expectedDomain?: string // From pre-extraction check
): {
  isValid: boolean;
  warning?: string;
  shouldRefilter: boolean;
  correctDomain: string;
} {
  if (!extractedWebsite) {
    return { isValid: true, shouldRefilter: false, correctDomain: expectedDomain || '' };
  }

  // Extract domain from website URL
  let extractedDomain: string;
  try {
    const url = new URL(extractedWebsite.startsWith('http') ? extractedWebsite : `https://${extractedWebsite}`);
    extractedDomain = url.hostname.replace('www.', '');
  } catch {
    extractedDomain = extractedWebsite.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  }

  // Check if extracted domain matches expected
  if (expectedDomain && extractedDomain !== expectedDomain && !extractedDomain.includes(expectedDomain)) {
    return {
      isValid: false,
      warning: `Extracted website (${extractedDomain}) doesn't match expected domain (${expectedDomain})`,
      shouldRefilter: true,
      correctDomain: extractedDomain,
    };
  }

  // Check if we have sources from conflicting domains
  const toolNameLower = toolName.toLowerCase();
  const conflictingDomains = sources
    .map(s => s.domain)
    .filter(d => {
      const domainLower = d.toLowerCase();
      return domainLower.includes(toolNameLower) &&
             d !== extractedDomain &&
             !d.includes(extractedDomain) &&
             !extractedDomain.includes(d);
    });

  const uniqueConflicts = [...new Set(conflictingDomains)];

  if (uniqueConflicts.length > 0) {
    return {
      isValid: false,
      warning: `Found ${uniqueConflicts.length} conflicting domain(s): ${uniqueConflicts.join(', ')}`,
      shouldRefilter: true,
      correctDomain: extractedDomain,
    };
  }

  return { isValid: true, shouldRefilter: false, correctDomain: extractedDomain };
}
