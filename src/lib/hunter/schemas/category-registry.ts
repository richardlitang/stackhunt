/**
 * Category Registry - Single Source of Truth
 *
 * Maps every category/sub-category to its schema layers.
 * The Hunter uses this to determine what to extract.
 *
 * Structure:
 * - slug: URL-friendly identifier (e.g., 'ci-cd')
 * - name: Human-readable name (e.g., 'CI/CD')
 * - parent: Parent category slug (null for top-level)
 * - layer2Schema: Name of the Layer 2 schema to use
 * - layer3Schema: Name of the Layer 3 specialization (optional)
 * - extractionCost: Additional cost in $ for this category
 * - personas: Which user personas this category primarily serves
 */

export interface CategoryDefinition {
  slug: string;
  name: string;
  description: string;
  parent: string | null;            // Parent category slug
  layer2Schema: string;             // e.g., 'DevToolsSchema'
  layer3Schema: string | null;      // e.g., 'CICDSchema'
  extractionCost: number;           // Additional $ per tool
  personas: PersonaTag[];           // Who cares about this category
  exampleTools: string[];           // Reference tools (for validation)
}

export type PersonaTag =
  | 'cto'
  | 'developer'
  | 'founder'
  | 'ops_manager'
  | 'marketing'
  | 'sales'
  | 'hr'
  | 'finance'
  | 'security'
  | 'support'
  | 'designer'
  | 'product_manager'
  | 'indie_hacker';

// ============================================================================
// THE REGISTRY
// ============================================================================

export const CategoryRegistry: Record<string, CategoryDefinition> = {

  // ==========================================================================
  // DEVELOPER TOOLS (Parent)
  // ==========================================================================
  'developer-tools': {
    slug: 'developer-tools',
    name: 'Developer Tools',
    description: 'Tools for software development, deployment, and operations',
    parent: null,
    layer2Schema: 'DevToolsSchema',
    layer3Schema: null,
    extractionCost: 0.00,
    personas: ['developer', 'cto'],
    exampleTools: ['github', 'vscode', 'docker'],
  },

  // CI/CD (Child of developer-tools)
  'ci-cd': {
    slug: 'ci-cd',
    name: 'CI/CD',
    description: 'Continuous integration and deployment platforms',
    parent: 'developer-tools',
    layer2Schema: 'DevToolsSchema',
    layer3Schema: 'CICDSchema',
    extractionCost: 0.00,
    personas: ['developer', 'cto'],
    exampleTools: ['github-actions', 'circleci', 'gitlab-ci'],
  },

  // Monitoring (Child of developer-tools)
  'monitoring': {
    slug: 'monitoring',
    name: 'Monitoring & Observability',
    description: 'Application performance monitoring and logging',
    parent: 'developer-tools',
    layer2Schema: 'DevToolsSchema',
    layer3Schema: 'MonitoringSchema',
    extractionCost: 0.01,
    personas: ['developer', 'cto', 'ops_manager'],
    exampleTools: ['datadog', 'new-relic', 'grafana'],
  },

  // API Development (Child of developer-tools)
  'api-development': {
    slug: 'api-development',
    name: 'API Development',
    description: 'Tools for building, testing, and documenting APIs',
    parent: 'developer-tools',
    layer2Schema: 'DevToolsSchema',
    layer3Schema: 'APIDevSchema',
    extractionCost: 0.00,
    personas: ['developer'],
    exampleTools: ['postman', 'insomnia', 'hoppscotch'],
  },

  // Version Control (Child of developer-tools)
  'version-control': {
    slug: 'version-control',
    name: 'Version Control',
    description: 'Code hosting and Git platforms',
    parent: 'developer-tools',
    layer2Schema: 'DevToolsSchema',
    layer3Schema: 'VersionControlSchema',
    extractionCost: 0.00,
    personas: ['developer', 'cto'],
    exampleTools: ['github', 'gitlab', 'bitbucket'],
  },

  // ==========================================================================
  // INFRASTRUCTURE & DATABASES (Parent)
  // ==========================================================================
  'infrastructure': {
    slug: 'infrastructure',
    name: 'Infrastructure & Databases',
    description: 'Cloud hosting, databases, and backend services',
    parent: null,
    layer2Schema: 'InfrastructureSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['developer', 'cto', 'indie_hacker'],
    exampleTools: ['aws', 'supabase', 'vercel'],
  },

  'databases': {
    slug: 'databases',
    name: 'Databases',
    description: 'Managed database services',
    parent: 'infrastructure',
    layer2Schema: 'InfrastructureSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['developer', 'cto'],
    exampleTools: ['supabase', 'planetscale', 'neon'],
  },

  'serverless': {
    slug: 'serverless',
    name: 'Serverless & Edge',
    description: 'Serverless functions and edge computing',
    parent: 'infrastructure',
    layer2Schema: 'InfrastructureSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['developer', 'cto'],
    exampleTools: ['vercel', 'cloudflare-workers', 'aws-lambda'],
  },

  'backend-as-a-service': {
    slug: 'backend-as-a-service',
    name: 'Backend as a Service',
    description: 'Full backend platforms with auth, database, storage',
    parent: 'infrastructure',
    layer2Schema: 'InfrastructureSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['developer', 'indie_hacker', 'founder'],
    exampleTools: ['firebase', 'supabase', 'appwrite'],
  },

  // ==========================================================================
  // PRODUCTIVITY (Parent)
  // ==========================================================================
  'productivity': {
    slug: 'productivity',
    name: 'Productivity',
    description: 'Tools for organizing work and information',
    parent: null,
    layer2Schema: 'ProductivitySchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['product_manager', 'founder', 'indie_hacker'],
    exampleTools: ['notion', 'todoist', 'linear'],
  },

  'note-taking': {
    slug: 'note-taking',
    name: 'Note-Taking & PKM',
    description: 'Personal knowledge management and note-taking',
    parent: 'productivity',
    layer2Schema: 'ProductivitySchema',
    layer3Schema: 'NoteTakingSchema',
    extractionCost: 0.01,
    personas: ['indie_hacker', 'developer', 'product_manager'],
    exampleTools: ['notion', 'obsidian', 'roam-research', 'logseq'],
  },

  'project-management': {
    slug: 'project-management',
    name: 'Project Management',
    description: 'Team task and project tracking',
    parent: 'productivity',
    layer2Schema: 'ProductivitySchema',
    layer3Schema: 'ProjectManagementSchema',
    extractionCost: 0.01,
    personas: ['product_manager', 'cto', 'ops_manager'],
    exampleTools: ['linear', 'asana', 'jira', 'monday'],
  },

  'documentation': {
    slug: 'documentation',
    name: 'Documentation',
    description: 'Knowledge bases and documentation platforms',
    parent: 'productivity',
    layer2Schema: 'ProductivitySchema',
    layer3Schema: 'DocumentationSchema',
    extractionCost: 0.01,
    personas: ['developer', 'product_manager', 'cto'],
    exampleTools: ['confluence', 'gitbook', 'notion'],
  },

  // ==========================================================================
  // CRM & SALES (Parent)
  // ==========================================================================
  'crm-sales': {
    slug: 'crm-sales',
    name: 'CRM & Sales',
    description: 'Customer relationship management and sales tools',
    parent: null,
    layer2Schema: 'CRMSalesSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['sales', 'founder'],
    exampleTools: ['hubspot', 'salesforce', 'pipedrive'],
  },

  'sales-crm': {
    slug: 'sales-crm',
    name: 'Sales CRM',
    description: 'Pipeline and deal management for sales teams',
    parent: 'crm-sales',
    layer2Schema: 'CRMSalesSchema',
    layer3Schema: 'SalesCRMSchema',
    extractionCost: 0.01,
    personas: ['sales', 'founder'],
    exampleTools: ['pipedrive', 'close', 'salesforce'],
  },

  'marketing-automation': {
    slug: 'marketing-automation',
    name: 'Marketing Automation',
    description: 'Email marketing and marketing automation platforms',
    parent: 'crm-sales',
    layer2Schema: 'CRMSalesSchema',
    layer3Schema: 'MarketingCRMSchema',
    extractionCost: 0.01,
    personas: ['marketing', 'founder'],
    exampleTools: ['hubspot', 'mailchimp', 'activecampaign'],
  },

  // ==========================================================================
  // COMMUNICATION (Parent)
  // ==========================================================================
  'communication': {
    slug: 'communication',
    name: 'Communication',
    description: 'Team messaging and video conferencing',
    parent: null,
    layer2Schema: 'CommunicationSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['ops_manager', 'cto', 'founder'],
    exampleTools: ['slack', 'zoom', 'discord'],
  },

  'team-chat': {
    slug: 'team-chat',
    name: 'Team Chat',
    description: 'Real-time team messaging platforms',
    parent: 'communication',
    layer2Schema: 'CommunicationSchema',
    layer3Schema: 'TeamChatSchema',
    extractionCost: 0.01,
    personas: ['ops_manager', 'cto'],
    exampleTools: ['slack', 'discord', 'microsoft-teams'],
  },

  'video-conferencing': {
    slug: 'video-conferencing',
    name: 'Video Conferencing',
    description: 'Video meetings and webinars',
    parent: 'communication',
    layer2Schema: 'CommunicationSchema',
    layer3Schema: 'VideoConferencingSchema',
    extractionCost: 0.01,
    personas: ['ops_manager', 'sales', 'founder'],
    exampleTools: ['zoom', 'google-meet', 'microsoft-teams'],
  },

  // ==========================================================================
  // DESIGN & MARKETING (Parent)
  // ==========================================================================
  'design': {
    slug: 'design',
    name: 'Design',
    description: 'Design tools for UI/UX, graphics, and video',
    parent: null,
    layer2Schema: 'DesignMarketingSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['designer', 'marketing'],
    exampleTools: ['figma', 'canva', 'adobe-cc'],
  },

  'marketing': {
    slug: 'marketing',
    name: 'Marketing Tools',
    description: 'SEO, analytics, and content marketing',
    parent: null,
    layer2Schema: 'DesignMarketingSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['marketing', 'founder'],
    exampleTools: ['semrush', 'ahrefs', 'buffer'],
  },

  // ==========================================================================
  // ANALYTICS (Parent)
  // ==========================================================================
  'analytics': {
    slug: 'analytics',
    name: 'Analytics',
    description: 'Product, web, and business analytics',
    parent: null,
    layer2Schema: 'AnalyticsBISchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['product_manager', 'marketing', 'founder'],
    exampleTools: ['mixpanel', 'amplitude', 'google-analytics'],
  },

  'product-analytics': {
    slug: 'product-analytics',
    name: 'Product Analytics',
    description: 'User behavior and product usage analytics',
    parent: 'analytics',
    layer2Schema: 'AnalyticsBISchema',
    layer3Schema: 'ProductAnalyticsSchema',
    extractionCost: 0.01,
    personas: ['product_manager', 'cto'],
    exampleTools: ['mixpanel', 'amplitude', 'posthog'],
  },

  'web-analytics': {
    slug: 'web-analytics',
    name: 'Web Analytics',
    description: 'Website traffic and visitor analytics',
    parent: 'analytics',
    layer2Schema: 'AnalyticsBISchema',
    layer3Schema: 'WebAnalyticsSchema',
    extractionCost: 0.01,
    personas: ['marketing', 'founder'],
    exampleTools: ['google-analytics', 'plausible', 'fathom'],
  },

  // ==========================================================================
  // ECOMMERCE & PAYMENTS (Parent)
  // ==========================================================================
  'ecommerce': {
    slug: 'ecommerce',
    name: 'eCommerce & Payments',
    description: 'Online stores and payment processing',
    parent: null,
    layer2Schema: 'EcommercePaymentsSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['founder', 'developer'],
    exampleTools: ['stripe', 'shopify', 'square'],
  },

  'payment-processing': {
    slug: 'payment-processing',
    name: 'Payment Processing',
    description: 'Payment gateways and processors',
    parent: 'ecommerce',
    layer2Schema: 'EcommercePaymentsSchema',
    layer3Schema: 'PaymentProcessingSchema',
    extractionCost: 0.01,
    personas: ['developer', 'founder', 'finance'],
    exampleTools: ['stripe', 'square', 'paypal'],
  },

  'ecommerce-platform': {
    slug: 'ecommerce-platform',
    name: 'eCommerce Platforms',
    description: 'Online store builders',
    parent: 'ecommerce',
    layer2Schema: 'EcommercePaymentsSchema',
    layer3Schema: 'EcommercePlatformSchema',
    extractionCost: 0.01,
    personas: ['founder', 'marketing'],
    exampleTools: ['shopify', 'woocommerce', 'bigcommerce'],
  },

  // ==========================================================================
  // ENTERPRISE & COMPLIANCE (Parent)
  // ==========================================================================
  'enterprise-software': {
    slug: 'enterprise-software',
    name: 'Enterprise Software',
    description: 'Enterprise-grade business applications',
    parent: null,
    layer2Schema: 'EnterpriseSaaSSchema',
    layer3Schema: null,
    extractionCost: 0.02,
    personas: ['cto', 'security', 'ops_manager'],
    exampleTools: ['salesforce', 'workday', 'servicenow'],
  },

  'security': {
    slug: 'security',
    name: 'Security & Identity',
    description: 'Security tools and identity management',
    parent: null,
    layer2Schema: 'SecurityIdentitySchema',
    layer3Schema: null,
    extractionCost: 0.02,
    personas: ['security', 'cto'],
    exampleTools: ['1password', 'okta', 'auth0'],
  },

  // ==========================================================================
  // SUPPORT & SUCCESS (Parent)
  // ==========================================================================
  'customer-support': {
    slug: 'customer-support',
    name: 'Customer Support',
    description: 'Help desk and customer service tools',
    parent: null,
    layer2Schema: 'CustomerSupportSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['support', 'ops_manager'],
    exampleTools: ['intercom', 'zendesk', 'freshdesk'],
  },

  // ==========================================================================
  // HR & FINANCE (Parents)
  // ==========================================================================
  'hr-recruiting': {
    slug: 'hr-recruiting',
    name: 'HR & Recruiting',
    description: 'Human resources and talent management',
    parent: null,
    layer2Schema: 'HRRecruitingSchema',
    layer3Schema: null,
    extractionCost: 0.02,
    personas: ['hr', 'founder', 'ops_manager'],
    exampleTools: ['ashby', 'deel', 'rippling'],
  },

  'finance': {
    slug: 'finance',
    name: 'Finance & Accounting',
    description: 'Accounting, invoicing, and expense management',
    parent: null,
    layer2Schema: 'FinanceSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['finance', 'founder'],
    exampleTools: ['quickbooks', 'xero', 'brex'],
  },

  // ==========================================================================
  // AI & AUTOMATION (Parent)
  // ==========================================================================
  'ai-automation': {
    slug: 'ai-automation',
    name: 'AI & Automation',
    description: 'AI tools and workflow automation',
    parent: null,
    layer2Schema: 'AIAutomationSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['developer', 'ops_manager', 'founder'],
    exampleTools: ['openai', 'zapier', 'n8n'],
  },

  // ==========================================================================
  // WEBSITE & CMS (Parent)
  // ==========================================================================
  'cms': {
    slug: 'cms',
    name: 'CMS & Website Builders',
    description: 'Content management and website building',
    parent: null,
    layer2Schema: 'CMSWebsiteSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['marketing', 'developer', 'founder'],
    exampleTools: ['wordpress', 'webflow', 'contentful'],
  },

  // ==========================================================================
  // NO-CODE & LOW-CODE (Parent)
  // ==========================================================================
  'no-code': {
    slug: 'no-code',
    name: 'No-Code & Low-Code',
    description: 'App builders and internal tool platforms',
    parent: null,
    layer2Schema: 'NoCodeLowCodeSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['ops_manager', 'founder', 'product_manager'],
    exampleTools: ['bubble', 'retool', 'airtable'],
  },

  // ==========================================================================
  // FILE STORAGE (Parent)
  // ==========================================================================
  'file-storage': {
    slug: 'file-storage',
    name: 'File Storage & Sharing',
    description: 'Cloud storage and file collaboration',
    parent: null,
    layer2Schema: 'FileStorageSchema',
    layer3Schema: null,
    extractionCost: 0.01,
    personas: ['ops_manager', 'founder'],
    exampleTools: ['dropbox', 'google-drive', 'box'],
  },

  // ==========================================================================
  // SCHEDULING (Parent)
  // ==========================================================================
  'scheduling': {
    slug: 'scheduling',
    name: 'Scheduling & Booking',
    description: 'Appointment scheduling and calendar management',
    parent: null,
    layer2Schema: 'SchedulingSchema',
    layer3Schema: null,
    extractionCost: 0.00,
    personas: ['sales', 'founder', 'ops_manager'],
    exampleTools: ['calendly', 'cal-com', 'acuity'],
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a category definition by slug.
 */
export function getCategoryDefinition(slug: string): CategoryDefinition | undefined {
  return CategoryRegistry[slug];
}

/**
 * Get all child categories of a parent.
 */
export function getChildCategories(parentSlug: string): CategoryDefinition[] {
  return Object.values(CategoryRegistry).filter(cat => cat.parent === parentSlug);
}

/**
 * Get the full hierarchy for a category (including ancestors).
 */
export function getCategoryHierarchy(slug: string): CategoryDefinition[] {
  const hierarchy: CategoryDefinition[] = [];
  let current = CategoryRegistry[slug];

  while (current) {
    hierarchy.unshift(current);
    current = current.parent ? CategoryRegistry[current.parent] : undefined as any;
  }

  return hierarchy;
}

/**
 * Get all top-level (parent) categories.
 */
export function getTopLevelCategories(): CategoryDefinition[] {
  return Object.values(CategoryRegistry).filter(cat => cat.parent === null);
}

/**
 * Get all categories that serve a specific persona.
 */
export function getCategoriesForPersona(persona: PersonaTag): CategoryDefinition[] {
  return Object.values(CategoryRegistry).filter(cat => cat.personas.includes(persona));
}

/**
 * Calculate total extraction cost for a category (including parent schemas).
 */
export function getTotalExtractionCost(slug: string): number {
  const baseCost = 0.15;
  const hierarchy = getCategoryHierarchy(slug);
  const additionalCost = Math.max(...hierarchy.map(c => c.extractionCost));
  return baseCost + additionalCost;
}

/**
 * Get schema names for a category.
 */
export function getSchemaNames(slug: string): { layer2: string; layer3: string | null } {
  const category = CategoryRegistry[slug];
  if (!category) {
    return { layer2: 'BaseToolSchema', layer3: null };
  }
  return {
    layer2: category.layer2Schema,
    layer3: category.layer3Schema,
  };
}
