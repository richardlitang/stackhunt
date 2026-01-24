/**
 * Hunter Error Types - API error detection and classification
 *
 * Provides typed errors for distinguishing between transient failures
 * (rate limits, network) vs critical failures (auth, quota).
 *
 * @module hunter/errors
 */

export type ApiErrorType =
  | 'rate_limit'      // 429 - Temporary, retry with backoff
  | 'auth_error'      // 401/403 - API key invalid
  | 'quota_exceeded'  // 402/429 with quota message - Billing issue
  | 'server_error'    // 5xx - Provider issue, retry
  | 'network_error'   // Connection failed
  | 'invalid_request' // 400 - Bad input
  | 'unknown';        // Other errors

export interface ApiErrorDetails {
  type: ApiErrorType;
  service: 'serper' | 'gemini';
  statusCode?: number;
  message: string;
  isRetryable: boolean;
  isCritical: boolean;  // Should alert immediately
  rawError?: unknown;
}

export class ApiError extends Error {
  public readonly type: ApiErrorType;
  public readonly service: 'serper' | 'gemini';
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;
  public readonly isCritical: boolean;
  public readonly rawError?: unknown;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiError';
    this.type = details.type;
    this.service = details.service;
    this.statusCode = details.statusCode;
    this.isRetryable = details.isRetryable;
    this.isCritical = details.isCritical;
    this.rawError = details.rawError;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      service: this.service,
      statusCode: this.statusCode,
      message: this.message,
      isRetryable: this.isRetryable,
      isCritical: this.isCritical,
    };
  }
}

/**
 * Classify an error from Serper API
 */
export function classifySerperError(error: unknown): ApiError {
  const service = 'serper' as const;

  // Axios error with response
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as Record<string, unknown> | undefined;
    const message = (data?.message as string) || error.message;

    if (status === 429) {
      return new ApiError({
        type: 'rate_limit',
        service,
        statusCode: status,
        message: `Serper rate limit exceeded: ${message}`,
        isRetryable: true,
        isCritical: false,
        rawError: error,
      });
    }

    if (status === 401 || status === 403) {
      return new ApiError({
        type: 'auth_error',
        service,
        statusCode: status,
        message: `Serper API key invalid or unauthorized: ${message}`,
        isRetryable: false,
        isCritical: true,
        rawError: error,
      });
    }

    if (status === 402) {
      return new ApiError({
        type: 'quota_exceeded',
        service,
        statusCode: status,
        message: `Serper quota/billing issue: ${message}`,
        isRetryable: false,
        isCritical: true,
        rawError: error,
      });
    }

    if (status === 400) {
      return new ApiError({
        type: 'invalid_request',
        service,
        statusCode: status,
        message: `Serper bad request: ${message}`,
        isRetryable: false,
        isCritical: false,
        rawError: error,
      });
    }

    if (status && status >= 500) {
      return new ApiError({
        type: 'server_error',
        service,
        statusCode: status,
        message: `Serper server error: ${message}`,
        isRetryable: true,
        isCritical: false,
        rawError: error,
      });
    }
  }

  // Network error (no response)
  if (isAxiosError(error) && !error.response) {
    return new ApiError({
      type: 'network_error',
      service,
      message: `Serper network error: ${error.message}`,
      isRetryable: true,
      isCritical: false,
      rawError: error,
    });
  }

  // Unknown error
  const errMessage = error instanceof Error ? error.message : String(error);
  return new ApiError({
    type: 'unknown',
    service,
    message: `Serper unknown error: ${errMessage}`,
    isRetryable: false,
    isCritical: false,
    rawError: error,
  });
}

/**
 * Classify an error from Gemini API
 */
export function classifyGeminiError(error: unknown): ApiError {
  const service = 'gemini' as const;
  const errMessage = error instanceof Error ? error.message : String(error);
  const errString = errMessage.toLowerCase();

  // Gemini returns specific error messages we can parse
  if (errString.includes('quota') || errString.includes('resource exhausted')) {
    return new ApiError({
      type: 'quota_exceeded',
      service,
      message: `Gemini quota exceeded: ${errMessage}`,
      isRetryable: false,
      isCritical: true,
      rawError: error,
    });
  }

  if (errString.includes('api key') || errString.includes('invalid') && errString.includes('key')) {
    return new ApiError({
      type: 'auth_error',
      service,
      message: `Gemini API key invalid: ${errMessage}`,
      isRetryable: false,
      isCritical: true,
      rawError: error,
    });
  }

  if (errString.includes('rate') || errString.includes('429') || errString.includes('too many')) {
    return new ApiError({
      type: 'rate_limit',
      service,
      message: `Gemini rate limit: ${errMessage}`,
      isRetryable: true,
      isCritical: false,
      rawError: error,
    });
  }

  if (errString.includes('500') || errString.includes('internal') || errString.includes('unavailable')) {
    return new ApiError({
      type: 'server_error',
      service,
      message: `Gemini server error: ${errMessage}`,
      isRetryable: true,
      isCritical: false,
      rawError: error,
    });
  }

  if (errString.includes('network') || errString.includes('econnrefused') || errString.includes('etimedout')) {
    return new ApiError({
      type: 'network_error',
      service,
      message: `Gemini network error: ${errMessage}`,
      isRetryable: true,
      isCritical: false,
      rawError: error,
    });
  }

  // Check for safety/blocked content - not retryable but not critical
  if (errString.includes('safety') || errString.includes('blocked') || errString.includes('harm')) {
    return new ApiError({
      type: 'invalid_request',
      service,
      message: `Gemini content blocked: ${errMessage}`,
      isRetryable: false,
      isCritical: false,
      rawError: error,
    });
  }

  // Unknown error
  return new ApiError({
    type: 'unknown',
    service,
    message: `Gemini unknown error: ${errMessage}`,
    isRetryable: false,
    isCritical: false,
    rawError: error,
  });
}

// Type guard for axios-like errors
interface AxiosLikeError {
  isAxiosError?: boolean;
  response?: {
    status?: number;
    data?: unknown;
  };
  message: string;
}

function isAxiosError(error: unknown): error is AxiosLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('isAxiosError' in error || 'response' in error) &&
    'message' in error
  );
}
