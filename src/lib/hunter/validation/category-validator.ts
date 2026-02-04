/**
 * Category Validator
 *
 * Ensures consistent category naming to prevent batching issues.
 * Maps various input formats to canonical category slugs.
 *
 * @module hunter/validation/category-validator
 */

/**
 * Canonical category slugs with their common variants
 *
 * The key is the canonical form (used in database),
 * values are known variations that map to it.
 */
const CANONICAL_CATEGORIES: Record<string, string[]> = {
  // Developer Tools
  'ai-code-editors': [
    'ai code editor', 'ai editor', 'code assistant', 'coding ai',
    'ai coding', 'ai ide', 'copilot', 'code completion',
  ],
  'developer-tools': [
    'developer tool', 'dev tool', 'ide', 'code editor',
    'development tool', 'devtool', 'programming tool',
  ],
  'databases': [
    'database', 'db', 'data store', 'datastore', 'sql',
    'nosql', 'dbms', 'data management',
  ],
  'serverless': [
    'serverless', 'faas', 'function as a service',
    'lambda', 'cloud functions',
  ],
  'baas': [
    'backend as a service', 'baas', 'backend service',
    'mobile backend', 'app backend',
  ],
  'ci-cd': [
    'ci/cd', 'ci cd', 'continuous integration', 'continuous deployment',
    'devops', 'build automation', 'deployment',
  ],
  'monitoring': [
    'monitoring', 'observability', 'apm', 'logging',
    'error tracking', 'application monitoring',
  ],
  'infrastructure': [
    'infrastructure', 'cloud infrastructure', 'iaas',
    'hosting', 'cloud hosting',
  ],

  // Business Tools
  'project-management': [
    'project management', 'pm tool', 'task management',
    'project tracking', 'work management',
  ],
  'crm-sales': [
    'crm', 'sales', 'customer relationship', 'sales tool',
    'lead management', 'sales automation',
  ],
  'team-chat': [
    'team chat', 'messaging', 'team communication',
    'workplace chat', 'business messaging',
  ],
  'note-taking': [
    'note taking', 'notes', 'note-taking app', 'notetaking',
    'knowledge management', 'personal knowledge',
  ],
  'email-marketing': [
    'email marketing', 'email automation', 'newsletter',
    'email tool', 'marketing email',
  ],

  // Analytics & Data
  'analytics-bi': [
    'analytics', 'business intelligence', 'bi tool', 'data analytics',
    'reporting', 'dashboards', 'data visualization',
  ],
  'product-analytics': [
    'product analytics', 'user analytics', 'behavioral analytics',
    'event tracking', 'user tracking',
  ],

  // AI & Automation
  'ai-automation': [
    'ai', 'automation', 'ai tool', 'artificial intelligence',
    'machine learning', 'ml tool',
  ],
  'ai-writing': [
    'ai writing', 'ai content', 'ai copywriting',
    'content generation', 'ai text',
  ],
  'ai-image': [
    'ai image', 'ai art', 'image generation',
    'ai design', 'generative art',
  ],

  // Design & Creative
  'design-creative': [
    'design', 'creative', 'graphic design', 'design tool',
    'visual design', 'creative tool',
  ],
  'video-editing': [
    'video editing', 'video production', 'video tool',
    'video software', 'editing',
  ],

  // Communication
  'video-conferencing': [
    'video conferencing', 'video call', 'video meeting',
    'virtual meeting', 'web conferencing',
  ],

  // Other
  'productivity': [
    'productivity', 'personal productivity', 'work tool',
    'efficiency', 'organization',
  ],
  'scheduling': [
    'scheduling', 'calendar', 'appointment', 'booking',
    'time management', 'meeting scheduler',
  ],
  'forms-surveys': [
    'forms', 'surveys', 'form builder', 'survey tool',
    'data collection', 'feedback',
  ],
  'storage': [
    'storage', 'file storage', 'cloud storage',
    'file sharing', 'document storage',
  ],
};

/**
 * Normalize a category string to its canonical slug form
 *
 * @param category - Input category string (can be any format)
 * @returns Canonical category slug, or slugified input if no match
 *
 * @example
 * normalizeCategory('AI Code Editor') // → 'ai-code-editors'
 * normalizeCategory('database') // → 'databases'
 * normalizeCategory('Some New Category') // → 'some-new-category'
 */
export function normalizeCategory(category: string): string {
  if (!category) return '';

  const lower = category.toLowerCase().trim();

  // Check for exact slug match first
  if (Object.keys(CANONICAL_CATEGORIES).includes(lower)) {
    return lower;
  }

  // Check for variant match
  for (const [canonical, variants] of Object.entries(CANONICAL_CATEGORIES)) {
    if (variants.some(v => lower.includes(v) || v.includes(lower))) {
      return canonical;
    }
  }

  // No match found - slugify the input
  return slugify(category);
}

/**
 * Check if a category is in the canonical list
 *
 * @param category - Category slug to validate
 * @returns True if category is a known canonical category
 */
export function isValidCategory(category: string): boolean {
  return Object.keys(CANONICAL_CATEGORIES).includes(category);
}

/**
 * Get all canonical category slugs
 *
 * @returns Array of all valid category slugs
 */
export function getCanonicalCategories(): string[] {
  return Object.keys(CANONICAL_CATEGORIES);
}

/**
 * Get variants for a canonical category
 *
 * @param category - Canonical category slug
 * @returns Array of known variants, or empty array if not found
 */
export function getCategoryVariants(category: string): string[] {
  return CANONICAL_CATEGORIES[category] || [];
}

/**
 * Convert a string to a URL-safe slug
 *
 * @param text - Input text
 * @returns Slugified string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
