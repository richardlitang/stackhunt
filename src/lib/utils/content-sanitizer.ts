/**
 * Content Sanitizer - Filters generic AI-generated fluff
 *
 * V4: Created to filter out generic strengths/delighters that don't
 * provide actionable insights. Only keeps strengths that mention
 * specific features or workflows.
 *
 * @module utils/content-sanitizer
 */

/**
 * Generic phrases that indicate AI fluff (case-insensitive matching)
 */
const GENERIC_STRENGTH_BAN_LIST = [
  // User-friendliness (too vague)
  'user-friendly interface',
  'user friendly interface',
  'easy to use',
  'intuitive interface',
  'clean interface',
  'modern interface',
  'sleek design',
  'nice design',
  'beautiful design',
  'great design',
  'good design',

  // Support (everyone claims this)
  'great support',
  'excellent support',
  'good support',
  'responsive support',
  'helpful support',
  'great customer service',
  'excellent customer service',

  // Flexibility (meaningless without specifics)
  'flexible platform',
  'flexible solution',
  'highly flexible',
  'very flexible',
  'customizable',
  'highly customizable',
  'scalable',
  'highly scalable',

  // Generic praise
  'powerful features',
  'robust features',
  'comprehensive features',
  'full-featured',
  'feature-rich',
  'all-in-one solution',
  'one-stop solution',
  'seamless experience',
  'seamless integration',
  'streamlined workflow',
  'great value',
  'good value',
  'best value',
  'affordable',
  'cost-effective',
  'great for teams',
  'great for businesses',
  'ideal for teams',
  'perfect for teams',

  // Marketing speak
  'game-changer',
  'game changer',
  'industry-leading',
  'industry leading',
  'best-in-class',
  'best in class',
  'world-class',
  'world class',
  'cutting-edge',
  'cutting edge',
  'next-generation',
  'next generation',
  'innovative',
  'revolutionary',
  'transformative',

  // Reliability (everyone says this)
  'reliable',
  'dependable',
  'stable',
  'trustworthy',
  'secure',
  'fast',
  'quick',
  'speedy',
  'efficient',
];

/**
 * Patterns that indicate a SPECIFIC strength (should be kept)
 * These are regex patterns that indicate actionable details.
 */
const SPECIFIC_STRENGTH_PATTERNS = [
  // Feature names (often contain keywords like "mode", "editor", "builder")
  /\b\w+ mode\b/i,
  /\b\w+ editor\b/i,
  /\b\w+ builder\b/i,
  /\b\w+ palette\b/i,
  /\bcommand \w+/i,

  // Keyboard shortcuts
  /\bcmd\+/i,
  /\bctrl\+/i,
  /\balt\+/i,
  /keyboard shortcut/i,
  /shortcut/i,

  // Specific actions
  /one-click/i,
  /single-click/i,
  /drag.?and.?drop/i,
  /real-?time/i,
  /offline/i,
  /auto-?save/i,
  /version\s*history/i,
  /rollback/i,
  /undo/i,

  // Integration specifics
  /integrat(es|ion) with \w+/i,
  /\bAPI\b/i,
  /\bwebhook/i,
  /\bZapier\b/i,
  /\bSlack\b/i,

  // Quantitative claims
  /\d+\s*ms/i,           // Response times
  /\d+%/i,               // Percentages
  /\d+x faster/i,        // Speed comparisons
  /unlimited/i,          // Specific limit claims
  /\d+\s*(users?|seats?|gb|projects?)/i, // Specific limits

  // Technical features
  /dark mode/i,
  /vim mode/i,
  /markdown/i,
  /\bSSO\b/i,
  /two-?factor/i,
  /2FA/i,
  /encryption/i,
  /self-hosted/i,
  /open.?source/i,
];

/**
 * Check if a strength is generic fluff
 *
 * @param strength - The strength text to check
 * @returns true if the strength is generic (should be filtered out)
 */
export function isGenericStrength(strength: string): boolean {
  const lowerStrength = strength.toLowerCase().trim();

  // Check against ban list
  for (const banned of GENERIC_STRENGTH_BAN_LIST) {
    if (lowerStrength.includes(banned.toLowerCase())) {
      return true;
    }
  }

  // If too short (less than 20 chars), likely generic
  if (lowerStrength.length < 20) {
    return true;
  }

  // Check if it contains specific patterns (override ban list)
  for (const pattern of SPECIFIC_STRENGTH_PATTERNS) {
    if (pattern.test(strength)) {
      return false; // Has specific details, keep it
    }
  }

  // Default: Keep if it's longer than 40 chars (likely has context)
  return lowerStrength.length < 40;
}

/**
 * Filter out generic strengths from a list
 *
 * @param strengths - Array of strength strings
 * @returns Filtered array with only specific, actionable strengths
 *
 * @example
 * const filtered = filterGenericStrengths([
 *   "User-friendly interface",        // REMOVED (generic)
 *   "Great support",                   // REMOVED (generic)
 *   "One-click rollback to any state", // KEPT (specific feature)
 *   "Real-time collaboration",         // KEPT (specific feature)
 *   "Cmd+K opens command palette",     // KEPT (specific shortcut)
 * ]);
 * // Returns: ["One-click rollback to any state", "Real-time collaboration", "Cmd+K opens command palette"]
 */
export function filterGenericStrengths(strengths: string[]): string[] {
  if (!strengths || !Array.isArray(strengths)) return [];

  return strengths.filter(strength => !isGenericStrength(strength));
}

/**
 * Check if a frustration is too vague to be useful
 *
 * @param frustration - The frustration text to check
 * @returns true if the frustration is too vague
 */
export function isGenericFrustration(frustration: string): boolean {
  const lowerFrustration = frustration.toLowerCase().trim();

  const vagueFrustrations = [
    'too expensive',
    'expensive',
    'overpriced',
    'pricey',
    'slow',
    'buggy',
    'crashes',
    'not intuitive',
    'confusing',
    'steep learning curve',
    'learning curve',
    'limited features',
    'missing features',
    'poor support',
    'bad support',
  ];

  // Check if it's just a vague complaint without specifics
  for (const vague of vagueFrustrations) {
    if (lowerFrustration === vague || lowerFrustration === vague + '.') {
      return true;
    }
  }

  return false;
}

/**
 * Filter out vague frustrations
 */
export function filterGenericFrustrations(frustrations: string[]): string[] {
  if (!frustrations || !Array.isArray(frustrations)) return [];

  return frustrations.filter(frustration => !isGenericFrustration(frustration));
}
