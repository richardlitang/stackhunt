import { generateToolFAQSchema } from '@/lib/seo';
import type { Tool } from '@/types/database';
import type { KnowledgeCard } from '@/lib/knowledge-card';

interface BuildToolPageFaqSchemaInput {
  hasFAQ: boolean;
  tool: Tool;
  knowledgeCardForSeo: KnowledgeCard | null;
}

export function buildToolPageFaqSchema(input: BuildToolPageFaqSchemaInput): unknown | null {
  if (!input.hasFAQ) return null;
  return generateToolFAQSchema(input.tool, input.knowledgeCardForSeo);
}
