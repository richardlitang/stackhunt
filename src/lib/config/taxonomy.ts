/**
 * Category Taxonomy Normalization
 *
 * Maps granular AI-extracted categories to canonical clusters.
 * This ensures tools in the same functional space cluster together
 * in hybrid search, even if Gemini uses slightly different labels.
 *
 * @module config/taxonomy
 */

/**
 * Reverse lookup map: raw category -> canonical parent
 * O(1) lookup at write time
 */
export const CATEGORY_MAP: Record<string, string> = {
  // --- Design Cluster ---
  'UI/UX Design': 'Design',
  'Graphic Design': 'Design',
  'Vector Graphics Software': 'Design',
  'Design Systems Software': 'Design',
  'Prototyping': 'Design',
  'Illustration': 'Design',
  'Web Design': 'Design',
  'Motion Design': 'Design',

  // --- Project Management Cluster ---
  'Work Management': 'Project Management',
  'Task Management': 'Project Management',
  'Issue Tracking': 'Project Management',
  'Roadmapping': 'Project Management',
  'OKRs': 'Project Management',
  'Agile Tools': 'Project Management',

  // --- Development Cluster ---
  'Backend as a Service': 'Development',
  'Cloud Infrastructure': 'Development',
  'IDE': 'Development',
  'Version Control': 'Development',
  'CI/CD': 'Development',
  'API Management': 'Development',
  'Database Management': 'Development',
  'DevOps': 'Development',

  // --- Analytics Cluster ---
  'SEO': 'Analytics',
  'Product Analytics': 'Analytics',
  'Web Analytics': 'Analytics',
  'Business Intelligence': 'Analytics',
  'Data Visualization': 'Analytics',

  // --- Communication Cluster ---
  'Team Chat': 'Communication',
  'Video Conferencing': 'Communication',
  'Email': 'Communication',
  'Messaging': 'Communication',

  // --- CRM Cluster ---
  'Sales CRM': 'CRM',
  'Marketing Automation': 'CRM',
  'Customer Success': 'CRM',
  'Lead Generation': 'CRM',

  // --- Finance Cluster ---
  'Accounting': 'Finance',
  'Invoicing': 'Finance',
  'Expense Management': 'Finance',
  'Payroll': 'Finance',
  'Corporate Cards': 'Finance',

  // --- HR Cluster ---
  'HR Management': 'HR',
  'Recruiting': 'HR',
  'Employee Onboarding': 'HR',
  'Global Payroll': 'HR',
  'EOR': 'HR',

  // --- Productivity Cluster ---
  'Note Taking': 'Productivity',
  'Knowledge Management': 'Productivity',
  'Documentation': 'Productivity',
  'Writing Tools': 'Productivity',
  'Time Tracking': 'Productivity',

  // --- Automation Cluster ---
  'Workflow Automation': 'Automation',
  'Integration Platform': 'Automation',
  'No-Code': 'Automation',
  'Low-Code': 'Automation',

  // --- AI Cluster ---
  'AI Image Generation': 'AI Tools',
  'AI Voice': 'AI Tools',
  'AI Writing': 'AI Tools',
  'AI Coding': 'AI Tools',
};

/**
 * Returns the canonical category for a raw input.
 * Falls back to the raw input if no mapping exists.
 */
export function normalizeCategory(rawCategory: string | undefined | null): string {
  if (!rawCategory) return 'Uncategorized';
  return CATEGORY_MAP[rawCategory] || rawCategory;
}

/**
 * Check if two categories belong to the same cluster
 */
export function isSameCluster(categoryA: string | undefined, categoryB: string | undefined): boolean {
  if (!categoryA || !categoryB) return false;
  return normalizeCategory(categoryA) === normalizeCategory(categoryB);
}

/**
 * Get all raw categories that map to a canonical parent
 */
export function getClusterMembers(canonical: string): string[] {
  return Object.entries(CATEGORY_MAP)
    .filter(([_, parent]) => parent === canonical)
    .map(([raw, _]) => raw);
}

/**
 * DEV UTILITY: Generates SQL to migrate existing data.
 * Run this to get the UPDATE statement for backfilling.
 */
export function generateMigrationSQL(): string {
  const cases = Object.entries(CATEGORY_MAP)
    .map(([raw, canonical]) => `    WHEN '${raw}' THEN '${canonical}'`)
    .join('\n');

  return `-- Taxonomy Normalization Migration
-- Generated from src/lib/config/taxonomy.ts
-- Run this ONCE to backfill existing items

UPDATE items
SET specs = jsonb_set(
  jsonb_set(
    specs,
    '{taxonomy, original_function}',
    to_jsonb(specs->'taxonomy'->>'primary_function')
  ),
  '{taxonomy, primary_function}',
  to_jsonb(
    CASE specs->'taxonomy'->>'primary_function'
${cases}
    ELSE specs->'taxonomy'->>'primary_function'
    END
  )
)
WHERE
  specs->'taxonomy'->>'primary_function' IS NOT NULL
  AND specs->'taxonomy'->>'primary_function' IN (
    '${Object.keys(CATEGORY_MAP).join("',\n    '")}'
  );`;
}
