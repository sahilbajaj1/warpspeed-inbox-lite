export type ApiErrorCategory =
  | 'no_connection'
  | 'timeout'
  | 'cancellation'
  | 'unauthorized'
  | 'forbidden'
  | 'insufficient_credits'
  | 'not_found'
  | 'gone'
  | 'rate_limited'
  | 'server_failure'
  | 'invalid_response'
  | 'unknown';

export type ApiErrorOptions = {
  category: ApiErrorCategory;
  message: string;
  code?: string;
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
  /** True when a safe automated retry may be appropriate for this error class. */
  retryable?: boolean;
  /** True when a write may have been applied despite the failure (e.g. 5xx/timeout). */
  outcomeUncertain?: boolean;
};

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly code?: string;
  readonly status?: number;
  readonly retryAfterSeconds?: number;
  readonly retryable: boolean;
  readonly outcomeUncertain: boolean;
  override readonly cause?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.category = options.category;
    this.code = options.code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.retryable = options.retryable ?? false;
    this.outcomeUncertain = options.outcomeUncertain ?? false;
    this.cause = options.cause;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** User-facing copy — never include stack traces or sensitive payloads. */
export function toUserMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.category) {
      case 'no_connection':
        return 'You appear to be offline. Check your connection and try again.';
      case 'timeout':
        return 'The request took too long. Please try again.';
      case 'cancellation':
        return 'The request was cancelled.';
      case 'unauthorized':
        return 'Your session has expired. Please sign in again.';
      case 'forbidden':
        return 'You do not have permission to do that.';
      case 'insufficient_credits':
        return 'You do not have enough AI credits for this action.';
      case 'not_found':
        return 'That item could not be found.';
      case 'gone':
        return 'This data is out of date and needs to be refreshed.';
      case 'rate_limited':
        return 'Too many requests. Please wait a moment and try again.';
      case 'server_failure':
        return 'The server had a problem. Please try again shortly.';
      case 'invalid_response':
        return 'Received an unexpected response from the server.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }

  if (error instanceof Error && error.message) {
    return 'Something went wrong. Please try again.';
  }

  return 'Something went wrong. Please try again.';
}

export function mapHttpStatusToCategory(
  status: number,
  code?: string,
): ApiErrorCategory {
  if (status === 401) return 'unauthorized';
  if (status === 402 || code === 'insufficient_credits') return 'insufficient_credits';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 410) return 'gone';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_failure';
  return 'unknown';
}
