import { generateReviewSchema } from '@/lib/seo';

interface BuildToolPagePageSchemaRouteStateInput {
  schemas: unknown[];
  firstReview: Parameters<typeof generateReviewSchema>[1] | null;
  tool: Parameters<typeof generateReviewSchema>[0];
  categoryName: string | null;
}

export function buildToolPagePageSchemaRouteState(input: BuildToolPagePageSchemaRouteStateInput): {
  pageSchemas: unknown[];
} {
  if (!input.firstReview) {
    return {
      pageSchemas: input.schemas,
    };
  }

  return {
    pageSchemas: [
      ...input.schemas,
      generateReviewSchema(input.tool, input.firstReview, input.categoryName || 'General software'),
    ],
  };
}
