import type { z } from 'zod';

import { appConfig } from '@/core/config/app-config';
import { ApiError } from '@/core/api/errors';
import { logger } from '@/core/logging/logger';
import {
  extractUserBalanceHeader,
  parseApiErrorFromBody,
  parseEnvelope,
  parseJsonUnknown,
  type ParsedEnvelope,
} from '@/core/api/response-parser';
import {
  classifyRetry,
  type HttpMethod,
  type RetryPolicyOptions,
} from '@/core/api/retry-policy';
import type { ApiMeta } from '@/core/api/schemas';
import { fetchTransport, type HttpTransport } from '@/core/api/transport';

export type TokenProvider = {
  getAccessToken: () => string | null | Promise<string | null>;
  /**
   * Called on HTTP 401 for authenticated requests (not auth endpoints).
   * Should perform single-flight refresh and return true if the caller may retry once.
   */
  refreshAccessToken?: () => Promise<boolean>;
};

export type ApiClientOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  transport?: HttpTransport;
  tokens?: TokenProvider;
  onMeta?: (meta: ApiMeta) => void;
  onUserBalance?: (balance: number) => void;
  retry?: RetryPolicyOptions;
  sleep?: (ms: number) => Promise<void>;
};

export type ApiRequestOptions<T> = {
  method: HttpMethod;
  path: string;
  schema: z.ZodType<T>;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  /** When false, omit Authorization even if a token exists. Default true. */
  auth?: boolean;
  /** Skip refresh+retry on 401 (login/refresh/logout). */
  skipAuthRefresh?: boolean;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  /** Override default timeout for this request. */
  timeoutMs?: number;
  /** Disable automatic transport retries for this request. */
  retry?: false | RetryPolicyOptions;
};

const AUTH_PATH_PREFIXES = ['/auth/login', '/auth/refresh', '/auth/logout'];

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
}

function buildQuery(query?: ApiRequestOptions<unknown>['query']): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  );
}

function mapTransportFailure(error: unknown): ApiError {
  if (isAbortError(error)) {
    return new ApiError({
      category: 'cancellation',
      message: 'Request was cancelled.',
      cause: error,
    });
  }

  if (error instanceof TypeError) {
    return new ApiError({
      category: 'no_connection',
      message: 'Network request failed.',
      cause: error,
      retryable: true,
    });
  }

  return new ApiError({
    category: 'unknown',
    message: 'Request failed.',
    cause: error,
  });
}

export type ApiClient = {
  request: <T>(options: ApiRequestOptions<T>) => Promise<ParsedEnvelope<T>>;
};

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? appConfig.apiBaseUrl;
  const defaultTimeoutMs = options.timeoutMs ?? appConfig.requestTimeoutMs;
  const transport = options.transport ?? fetchTransport;
  const sleep = options.sleep ?? defaultSleep;

  async function requestOnce<T>(
    requestOptions: ApiRequestOptions<T>,
    alreadyRefreshed: boolean,
  ): Promise<ParsedEnvelope<T>> {
    const {
      method,
      path,
      schema,
      body,
      query,
      signal,
      auth = true,
      skipAuthRefresh = AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)),
      idempotencyKey,
      headers: extraHeaders,
      timeoutMs = defaultTimeoutMs,
    } = requestOptions;

    const controller = new AbortController();
    const onExternalAbort = () => {
      controller.abort();
    };
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const headers = new Headers(extraHeaders);
      headers.set('Accept', 'application/json');
      if (body !== undefined) {
        headers.set('Content-Type', 'application/json');
      }
      if (idempotencyKey) {
        headers.set('Idempotency-Key', idempotencyKey);
      }

      if (auth && options.tokens) {
        const token = await options.tokens.getAccessToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }

      const url = `${joinUrl(baseUrl, path)}${buildQuery(query)}`;
      logger.debug('api request', { method, path });

      let response: Response;
      try {
        response = await transport.request(url, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        if (isAbortError(error)) {
          if (signal?.aborted) {
            throw new ApiError({
              category: 'cancellation',
              message: 'Request was cancelled.',
              cause: error,
            });
          }
          throw new ApiError({
            category: 'timeout',
            message: `Request timed out after ${timeoutMs}ms.`,
            cause: error,
            retryable: true,
            outcomeUncertain: method !== 'GET',
          });
        }
        throw mapTransportFailure(error);
      }

      const rawText = await response.text();
      const parsedBody = rawText.length > 0 ? parseJsonUnknown(rawText) : {};

      if (!response.ok) {
        const apiError = parseApiErrorFromBody(parsedBody, response.status, response.headers);

        if (
          apiError.category === 'unauthorized' &&
          auth &&
          !skipAuthRefresh &&
          !alreadyRefreshed &&
          options.tokens?.refreshAccessToken
        ) {
          const refreshed = await options.tokens.refreshAccessToken();
          if (refreshed) {
            return requestOnce(requestOptions, true);
          }
        }

        throw apiError;
      }

      const envelope = parseEnvelope(parsedBody, schema);

      if (envelope.meta.userBalance !== undefined) {
        options.onUserBalance?.(envelope.meta.userBalance);
      }
      options.onMeta?.(envelope.meta);

      const headerBalance = extractUserBalanceHeader(response.headers);
      if (headerBalance !== undefined) {
        options.onUserBalance?.(headerBalance);
      }

      return envelope;
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  return {
    async request(requestOptions) {
      const retryOptions =
        requestOptions.retry === false
          ? { maxRetries: 0 }
          : { ...options.retry, ...requestOptions.retry };

      let attempt = 0;
      for (;;) {
        try {
          return await requestOnce(requestOptions, false);
        } catch (error) {
          if (!(error instanceof ApiError)) {
            throw error;
          }

          const decision = classifyRetry({
            error,
            method: requestOptions.method,
            attempt,
            hasIdempotencyKey: Boolean(requestOptions.idempotencyKey),
            options: retryOptions,
          });

          if (!decision.shouldRetry) {
            throw error;
          }

          logger.warn('api retry scheduled', {
            path: requestOptions.path,
            attempt,
            delayMs: decision.delayMs,
            reason: decision.reason,
            category: error.category,
          });

          await sleep(decision.delayMs);
          attempt += 1;
        }
      }
    },
  };
}
