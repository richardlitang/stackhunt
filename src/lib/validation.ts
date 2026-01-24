/**
 * API Validation Schemas
 *
 * Zod schemas for request validation across API endpoints.
 * Provides type-safe validation with clear error messages.
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const SlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format (use lowercase letters, numbers, and hyphens)');

export const EmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long');

// ============================================================================
// VOTE ENDPOINT
// ============================================================================

export const VoteRequestSchema = z.object({
  reviewId: UUIDSchema,
  voteType: z.union([z.literal(-1), z.literal(0), z.literal(1)], {
    errorMap: () => ({ message: 'Vote type must be -1, 0, or 1' }),
  }),
  fingerprintHash: z.string().max(64).optional(),
  turnstileToken: z.string().max(2000).optional(),
});

export type VoteRequest = z.infer<typeof VoteRequestSchema>;

// ============================================================================
// QUEUE ENDPOINT
// ============================================================================

/**
 * Detects if a string looks like a search query pattern rather than a tool name.
 * Search queries like "best X for Y" or "X alternatives" should be contexts, not tools.
 */
function isSearchQueryPattern(str: string): boolean {
  const normalized = str.toLowerCase().trim();
  return (
    normalized.startsWith('best ') ||
    normalized.endsWith(' alternatives') ||
    normalized.includes(' vs ') ||
    normalized.startsWith('top ') ||
    normalized.includes('how to ')
  );
}

export const QueueAddRequestSchema = z.object({
  tool_name: z
    .string()
    .min(1, 'Tool name is required')
    .max(100, 'Tool name too long')
    .transform(s => s.trim())
    .refine(
      (name) => !isSearchQueryPattern(name),
      'Tool name looks like a search query (e.g., "best X for Y"). Use an actual tool name like "Notion" or "Figma".'
    ),
  context_title: z
    .string()
    .max(200, 'Context title too long')
    .transform(s => s?.trim() || null)
    .optional()
    .nullable(),
  category_slug: SlugSchema.optional().nullable(),
  priority: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(50),
});

export type QueueAddRequest = z.infer<typeof QueueAddRequestSchema>;

// ============================================================================
// CORRECTIONS ENDPOINT
// ============================================================================

export const CorrectionRequestSchema = z.object({
  tool_id: UUIDSchema,
  field_name: z
    .string()
    .min(1, 'Field name is required')
    .max(50, 'Field name too long'),
  correction_text: z
    .string()
    .min(5, 'Correction must be at least 5 characters')
    .max(1000, 'Correction too long'),
  reporter_email: EmailSchema.optional().nullable(),
});

export type CorrectionRequest = z.infer<typeof CorrectionRequestSchema>;

// ============================================================================
// HUNT ENDPOINT
// ============================================================================

export const HuntRequestSchema = z.object({
  toolName: z
    .string()
    .min(1, 'Tool name is required')
    .max(100, 'Tool name too long')
    .transform(s => s.trim())
    .refine(
      (name) => !isSearchQueryPattern(name),
      'Tool name looks like a search query (e.g., "best X for Y"). Use an actual tool name like "Notion" or "Figma".'
    ),
  contextTitle: z
    .string()
    .max(200, 'Context title too long')
    .transform(s => s?.trim() || undefined)
    .optional(),
  categorySlug: SlugSchema.optional(),
  publish: z.boolean().default(false),
});

export type HuntRequest = z.infer<typeof HuntRequestSchema>;

// ============================================================================
// CONTEXT HUNT ENDPOINT
// ============================================================================

export const ContextHuntGuidanceSchema = z.object({
  mustIncludeTools: z.array(z.string().max(100)).max(10).optional(),
  sourcesToCheck: z.array(z.string().max(100)).max(5).optional(),
  specialInstructions: z.string().max(500).optional(),
});

export const ContextHuntRequestSchema = z.object({
  contextQuery: z
    .string()
    .min(3, 'Context query is required')
    .max(200, 'Context query too long')
    .transform(s => s.trim()),
  maxTools: z.number().int().min(1).max(10).default(5),
  publish: z.boolean().default(false),
  guidance: ContextHuntGuidanceSchema.optional(),
});

export type ContextHuntRequest = z.infer<typeof ContextHuntRequestSchema>;

// ============================================================================
// REVIEW UPDATE ENDPOINT
// ============================================================================

export const ReviewUpdateRequestSchema = z.object({
  score: z.number().min(0).max(100).optional(),
  summary_markdown: z.string().max(10000).optional(),
  pros: z.array(z.string().max(500)).max(10).optional(),
  cons: z.array(z.string().max(500)).max(10).optional(),
  sentiment_tags: z.array(z.string().max(50)).max(10).optional(),
  reviewer_notes: z.string().max(1000).optional(),
  action: z.enum(['save', 'publish', 'reject']).default('save'),
});

export type ReviewUpdateRequest = z.infer<typeof ReviewUpdateRequestSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate request body with a Zod schema
 * Returns parsed data or throws formatted error
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { data: null, error: message };
    }
    if (err instanceof SyntaxError) {
      return { data: null, error: 'Invalid JSON body' };
    }
    return { data: null, error: 'Validation failed' };
  }
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(error: string): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
