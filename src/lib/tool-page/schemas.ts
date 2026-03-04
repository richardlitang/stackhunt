import {
  generateBreadcrumbSchema,
  generateToolSchema,
  generateVideoSchema,
} from '@/lib/seo';

type ToolPageSchemaTool = Parameters<typeof generateToolSchema>[0];
type ToolPagePrimaryOffer = Parameters<typeof generateToolSchema>[1];

interface BuildToolPageSchemasInput {
  tool: ToolPageSchemaTool;
  primaryOffer: ToolPagePrimaryOffer | null;
  reviewCount: number;
  faqSchema: unknown | null;
}

export function buildToolPageSchemas(input: BuildToolPageSchemasInput): unknown[] {
  return [
    generateToolSchema(input.tool, input.primaryOffer ?? undefined, input.reviewCount),
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Tools', url: '/tools' },
      ...(input.tool.category
        ? [{ name: input.tool.category.name, url: `/categories/${input.tool.category.slug}` }]
        : []),
      { name: input.tool.name, url: `/tool/${input.tool.slug}` },
    ]),
    ...(input.tool.video_id
      ? [
          generateVideoSchema(
            input.tool,
            input.tool.video_id,
            input.tool.video_title || `${input.tool.name} Overview`
          ),
        ]
      : []),
    ...(input.faqSchema ? [input.faqSchema] : []),
  ];
}
