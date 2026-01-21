/**
 * API Response Utilities
 *
 * Centralized error handling and response helpers for consistent API responses.
 */

// Standard API error codes
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ApiErrorOptions {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

interface ApiSuccessOptions<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  options: ApiErrorOptions,
  status: number = 500
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: options.code,
        message: options.message,
        ...(options.details && { details: options.details }),
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  options: ApiSuccessOptions<T>,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: options.data,
      ...(options.meta && { meta: options.meta }),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Convenience methods for common responses
export const ApiResponse = {
  // Success responses
  ok: <T>(data: T, meta?: Record<string, unknown>) =>
    successResponse({ data, meta }, 200),

  created: <T>(data: T, meta?: Record<string, unknown>) =>
    successResponse({ data, meta }, 201),

  noContent: () =>
    new Response(null, { status: 204 }),

  // Error responses
  badRequest: (message: string, details?: Record<string, unknown>) =>
    errorResponse({ code: ErrorCodes.BAD_REQUEST, message, details }, 400),

  validationError: (message: string, details?: Record<string, unknown>) =>
    errorResponse({ code: ErrorCodes.VALIDATION_ERROR, message, details }, 400),

  unauthorized: (message = 'Authentication required') =>
    errorResponse({ code: ErrorCodes.UNAUTHORIZED, message }, 401),

  forbidden: (message = 'Access denied') =>
    errorResponse({ code: ErrorCodes.FORBIDDEN, message }, 403),

  notFound: (message = 'Resource not found') =>
    errorResponse({ code: ErrorCodes.NOT_FOUND, message }, 404),

  conflict: (message: string) =>
    errorResponse({ code: ErrorCodes.CONFLICT, message }, 409),

  rateLimited: (message = 'Rate limit exceeded', retryAfter?: number) => {
    const response = errorResponse({ code: ErrorCodes.RATE_LIMITED, message }, 429);
    if (retryAfter) {
      response.headers.set('Retry-After', retryAfter.toString());
    }
    return response;
  },

  internalError: (message = 'Internal server error') =>
    errorResponse({ code: ErrorCodes.INTERNAL_ERROR, message }, 500),
};

/**
 * Wrap an API handler with error catching
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ApiError) {
        return errorResponse(
          { code: error.code, message: error.message, details: error.details },
          error.status
        );
      }

      return ApiResponse.internalError(
        process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'An unexpected error occurred'
      );
    }
  }) as T;
}

/**
 * Custom API Error class for throwing structured errors
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new ApiError(ErrorCodes.BAD_REQUEST, message, 400, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(ErrorCodes.UNAUTHORIZED, message, 401);
  }

  static forbidden(message = 'Access denied') {
    return new ApiError(ErrorCodes.FORBIDDEN, message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(ErrorCodes.NOT_FOUND, message, 404);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(ErrorCodes.INTERNAL_ERROR, message, 500);
  }
}
