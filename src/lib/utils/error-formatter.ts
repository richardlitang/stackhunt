/**
 * Error Formatting Utilities
 *
 * Provides utilities for formatting errors into human-readable messages.
 *
 * @module utils/error-formatter
 */

export interface FormattedError {
  /** Short, human-readable summary */
  summary: string;
  /** Full details (may be long) */
  details: string;
  /** Error category/type */
  category: string;
}

/**
 * Format a validation error (likely from Zod) into a readable message
 *
 * Input example: '[{"code":"invalid_type","expected":"string","received":"null","path":["title"]},{"code":"too_small","minimum":1,"path":["tags"]}]'
 * Output summary: "Validation failed: title (expected string, got null), tags (minimum 1)"
 */
export function formatValidationError(error: string): FormattedError {
  try {
    // Try to parse as JSON array (Zod error format)
    if (error.includes('[{"code":') || error.includes('[{')) {
      const parsed = JSON.parse(error);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const issues = parsed.map((issue: any) => {
          const path = issue.path?.join('.') || 'unknown field';
          const code = issue.code || 'validation error';

          // Format based on error code
          if (code === 'invalid_type') {
            return `${path}: expected ${issue.expected}, got ${issue.received}`;
          } else if (code === 'too_small') {
            return `${path}: minimum ${issue.minimum} required`;
          } else if (code === 'too_big') {
            return `${path}: maximum ${issue.maximum} exceeded`;
          } else if (code === 'invalid_string') {
            return `${path}: ${issue.validation || 'invalid format'}`;
          } else {
            return `${path}: ${issue.message || code}`;
          }
        });

        const summary =
          issues.length > 3
            ? `${issues.slice(0, 3).join(', ')} (+${issues.length - 3} more)`
            : issues.join(', ');

        return {
          summary: `Validation error: ${summary}`,
          details: error,
          category: 'Validation',
        };
      }
    }

    // Check if it's a semicolon-separated Zod error format
    // Example: "title: Required; tags: Expected array, received null"
    if (error.includes(': ') && (error.includes('; ') || error.split(':').length <= 3)) {
      return {
        summary: error.length > 150 ? error.slice(0, 147) + '...' : error,
        details: error,
        category: 'Validation',
      };
    }
  } catch {
    // Not a parseable validation error, fall through
  }

  // Check for common error patterns
  if (error.toLowerCase().includes('api key')) {
    return {
      summary: 'API key error - check credentials',
      details: error,
      category: 'Authentication',
    };
  }

  if (error.toLowerCase().includes('quota') || error.toLowerCase().includes('rate limit')) {
    return {
      summary: 'API quota/rate limit exceeded',
      details: error,
      category: 'Rate Limit',
    };
  }

  if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('forbidden')) {
    return {
      summary: 'Unauthorized - check permissions',
      details: error,
      category: 'Authorization',
    };
  }

  // Default: truncate intelligently
  const summary = error.length > 150 ? error.slice(0, 147) + '...' : error;

  return {
    summary,
    details: error,
    category: 'Error',
  };
}

/**
 * Truncate a string intelligently, preserving structure
 *
 * @param text Text to truncate
 * @param maxLength Maximum length (default: 200)
 * @returns Truncated text with ellipsis if needed
 */
export function smartTruncate(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to break at a sentence or clause boundary
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastComma = truncated.lastIndexOf(',');
  const lastSpace = truncated.lastIndexOf(' ');

  const breakPoint =
    lastPeriod > maxLength * 0.7
      ? lastPeriod + 1
      : lastComma > maxLength * 0.7
        ? lastComma + 1
        : lastSpace > maxLength * 0.7
          ? lastSpace
          : maxLength;

  return text.slice(0, breakPoint).trim() + '...';
}
