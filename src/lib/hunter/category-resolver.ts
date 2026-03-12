/**
 * Canonical category resolver for hunt pipeline.
 *
 * Unifies:
 * - taxonomy primary_function -> category slug
 * - context-title keyword -> category slug
 * - historical slug aliases -> canonical slug
 */

const SLUG_ALIAS_MAP: Record<string, string> = {
  // Historical drift aliases
  'team-chat': 'communication',
  'version-control': 'developer-tools',
  'sales-crm': 'crm-sales',
  'marketing-automation': 'email-marketing',
  'payment-processing': 'payments',
  'ecommerce-platform': 'payments',
  'ecommerce-payments': 'payments',
  'design-marketing': 'design',
  'no-code-low-code': 'no-code',
  'api-development': 'developer-tools',
  'file-storage': 'productivity',
  documentation: 'productivity',
  'note-taking': 'notetaking',
  'video-editing': 'video-audio',
  'security-identity': 'it-security',
};

const PRIMARY_FUNCTION_TO_SLUG: Record<string, string> = {
  'Project Management': 'project-management',
  Communication: 'communication',
  Notetaking: 'notetaking',
  'Note-Taking': 'notetaking',
  'Knowledge Management': 'productivity',
  'Developer Tools': 'developer-tools',
  'Code Editor': 'developer-tools',
  Development: 'developer-tools',
  'CI/CD': 'developer-tools',
  Monitoring: 'developer-tools',
  'API Development': 'developer-tools',
  'Version Control': 'developer-tools',
  IDE: 'developer-tools',
  Database: 'developer-tools',
  Serverless: 'developer-tools',
  'Backend as a Service': 'developer-tools',
  'Cloud Infrastructure': 'developer-tools',
  CRM: 'crm-sales',
  Collaboration: 'collaboration',
  Productivity: 'productivity',
  'AI & Automation': 'ai-automation',
  'Artificial Intelligence': 'ai-automation',
  AI: 'ai-automation',
  'AI Tools': 'ai-automation',
  'AI Code Assistant': 'ai-automation',
  'AI Code Editor': 'ai-automation',
  'AI Audio Platform': 'ai-automation',
  Analytics: 'seo-analytics',
  SEO: 'seo-analytics',
  'SEO Tools': 'seo-analytics',
  'Product Analytics': 'seo-analytics',
  'Web Analytics': 'seo-analytics',
  'Business Intelligence': 'seo-analytics',
  'Email Marketing': 'email-marketing',
  'Social Media': 'social-media',
  'Customer Support': 'customer-support',
  HR: 'hr-recruiting',
  'HR & Payroll': 'hr-recruiting',
  Recruiting: 'hr-recruiting',
  Accounting: 'accounting',
  'Accounting Software': 'accounting',
  Finance: 'finance',
  'Spend Management': 'accounting',
  'Business Banking': 'payments',
  Payments: 'payments',
  'Payment Processing': 'payments',
  'eCommerce Platform': 'payments',
  eCommerce: 'payments',
  Design: 'design',
  Marketing: 'social-media',
  'Video Editing': 'video-audio',
  'Video Conferencing': 'communication',
  'Team Chat': 'communication',
  'No-Code': 'no-code',
  'Low-Code': 'no-code',
  'Website Builder': 'no-code',
  CMS: 'no-code',
  Scheduling: 'productivity',
  Security: 'it-security',
  'File Storage': 'productivity',
  'Practice Management': 'healthcare',
  'Dental Practice Management': 'healthcare',
};

const KEYWORD_TO_SLUG: Record<string, string> = {
  'ai code': 'ai-automation',
  'ai editor': 'ai-automation',
  ai: 'ai-automation',
  automation: 'ai-automation',
  database: 'developer-tools',
  serverless: 'developer-tools',
  backend: 'developer-tools',
  'ci/cd': 'developer-tools',
  monitoring: 'developer-tools',
  observability: 'developer-tools',
  api: 'developer-tools',
  'project management': 'project-management',
  'task management': 'project-management',
  note: 'notetaking',
  documentation: 'productivity',
  wiki: 'productivity',
  chat: 'communication',
  slack: 'communication',
  video: 'communication',
  meeting: 'communication',
  crm: 'crm-sales',
  sales: 'crm-sales',
  'marketing automation': 'email-marketing',
  analytics: 'seo-analytics',
  payment: 'payments',
  ecommerce: 'payments',
  support: 'customer-support',
  helpdesk: 'customer-support',
  hr: 'hr-recruiting',
  recruiting: 'hr-recruiting',
  accounting: 'accounting',
  security: 'it-security',
  auth: 'it-security',
  design: 'design',
  'no-code': 'no-code',
  'low-code': 'no-code',
  cms: 'no-code',
  'website builder': 'no-code',
  storage: 'productivity',
  scheduling: 'productivity',
  calendar: 'productivity',
};

const DOSSIER_PRIMARY_CATEGORY_TO_SLUG: Record<string, string> = {
  ai_model: 'ai-automation',
  api_platform: 'developer-tools',
  saas_collaboration: 'collaboration',
  saas_productivity: 'productivity',
  crm_sales: 'crm-sales',
  marketing_email: 'email-marketing',
  database_storage: 'developer-tools',
  devtools: 'developer-tools',
  legacy_defunct: 'developer-tools',
  consumer_media: 'video-audio',
  infrastructure: 'developer-tools',
  design_creative: 'design',
  video_conferencing: 'communication',
  generic_saas: 'productivity',
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function normalizeCategorySlug(rawSlug?: string | null): string | undefined {
  if (!rawSlug) return undefined;
  const slug = slugify(rawSlug);
  if (!slug) return undefined;
  return SLUG_ALIAS_MAP[slug] || slug;
}

export function resolveCategoryFromPrimaryFunction(
  primaryFunction?: string | null
): string | undefined {
  if (!primaryFunction) return undefined;
  return normalizeCategorySlug(PRIMARY_FUNCTION_TO_SLUG[primaryFunction]);
}

export function resolveCategoryFromContextTitle(contextTitle?: string | null): string | undefined {
  if (!contextTitle) return undefined;
  const title = contextTitle.toLowerCase();
  for (const [keyword, slug] of Object.entries(KEYWORD_TO_SLUG)) {
    if (title.includes(keyword)) return normalizeCategorySlug(slug);
  }
  return undefined;
}

export function resolveCategoryFromDossierPrimaryCategory(
  primaryCategory?: string | null
): string | undefined {
  if (!primaryCategory) return undefined;
  const normalizedPrimaryCategory = primaryCategory.trim().toLowerCase();
  return normalizeCategorySlug(DOSSIER_PRIMARY_CATEGORY_TO_SLUG[normalizedPrimaryCategory]);
}

export function resolveDetectedCategory(params: {
  explicitCategorySlug?: string | null;
  detectedCategorySlug?: string | null;
  dossierPrimaryCategory?: string | null;
  taxonomyPrimaryFunction?: string | null;
  contextTitle?: string | null;
}): string | undefined {
  const explicit = normalizeCategorySlug(params.explicitCategorySlug);
  if (explicit) return explicit;

  const detected = normalizeCategorySlug(params.detectedCategorySlug);
  if (detected) return detected;

  const fromDossier = resolveCategoryFromDossierPrimaryCategory(params.dossierPrimaryCategory);
  if (fromDossier) return fromDossier;

  const fromTaxonomy = resolveCategoryFromPrimaryFunction(params.taxonomyPrimaryFunction);
  if (fromTaxonomy) return fromTaxonomy;

  return resolveCategoryFromContextTitle(params.contextTitle);
}
