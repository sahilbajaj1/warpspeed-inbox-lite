import { fetch as expoFetch } from 'expo/fetch';

import { ApiError, isApiError } from '@/core/api/errors';
import {
  extractUserBalanceHeader,
  parseApiErrorFromBody,
  parseJsonUnknown,
} from '@/core/api/response-parser';
import { appConfig } from '@/core/config/app-config';
import { logger } from '@/core/logging/logger';
import {
  createSseParser,
  mapSseFrameToSummaryEvent,
  type SummaryStreamEvent,
} from '@/features/summary/sse-parser';

export type SummaryStreamHandlers = {
  onEvent: (event: SummaryStreamEvent) => void;
  onUserBalance?: (balance: number) => void;
};

export type SummaryApi = {
  streamSummary: (input: {
    threadId: string;
    accessToken: string;
    signal?: AbortSignal;
    handlers: SummaryStreamHandlers;
  }) => Promise<void>;
};

/** Summary streams can run 5–30s; keep headroom above the default API timeout. */
const SUMMARY_TIMEOUT_MS = 60_000;

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export function createSummaryApi(deps?: {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}): SummaryApi {
  const baseUrl = deps?.baseUrl ?? appConfig.apiBaseUrl;
  const fetchImpl = deps?.fetchImpl ?? (expoFetch as unknown as FetchLike);
  const timeoutMs = deps?.timeoutMs ?? SUMMARY_TIMEOUT_MS;

  return {
    async streamSummary({ threadId, accessToken, signal, handlers }) {
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
        const url = `${baseUrl.replace(/\/+$/, '')}/threads/${encodeURIComponent(threadId)}/summary`;
        logger.info('summary stream starting', { threadId });

        let response: Response;
        try {
          response = await fetchImpl(url, {
            method: 'POST',
            headers: {
              Accept: 'text/event-stream',
              Authorization: `Bearer ${accessToken}`,
            },
            signal: controller.signal,
          });
        } catch (error) {
          if (isAbortError(error)) {
            throw new ApiError({
              category: signal?.aborted ? 'cancellation' : 'timeout',
              message: signal?.aborted
                ? 'Summary was cancelled.'
                : `Summary timed out after ${timeoutMs}ms.`,
              cause: error,
            });
          }
          throw new ApiError({
            category: 'no_connection',
            message: 'Unable to start summary stream.',
            cause: error,
            retryable: true,
          });
        }

        const headerBalance = extractUserBalanceHeader(response.headers);
        if (headerBalance !== undefined) {
          handlers.onUserBalance?.(headerBalance);
        }

        if (!response.ok) {
          let body: unknown = {};
          try {
            const text = await response.text();
            body = text.length > 0 ? parseJsonUnknown(text) : {};
          } catch {
            body = {};
          }
          throw parseApiErrorFromBody(body, response.status, response.headers);
        }

        const body = response.body;
        if (!body || typeof body.getReader !== 'function') {
          // Fallback: non-streaming environments still complete the request.
          const text = await response.text();
          dispatchSseText(text, handlers.onEvent);
          return;
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser();
        let sawTerminal = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });
          for (const frame of parser.push(chunk)) {
            const event = mapSseFrameToSummaryEvent(frame);
            if (!event) {
              continue;
            }
            handlers.onEvent(event);
            if (event.type === 'done' || event.type === 'error') {
              sawTerminal = true;
            }
          }
        }

        const trailing = decoder.decode();
        if (trailing) {
          for (const frame of parser.push(trailing)) {
            const event = mapSseFrameToSummaryEvent(frame);
            if (event) {
              handlers.onEvent(event);
              if (event.type === 'done' || event.type === 'error') {
                sawTerminal = true;
              }
            }
          }
        }

        for (const frame of parser.flush()) {
          const event = mapSseFrameToSummaryEvent(frame);
          if (event) {
            handlers.onEvent(event);
            if (event.type === 'done' || event.type === 'error') {
              sawTerminal = true;
            }
          }
        }

        if (!sawTerminal) {
          handlers.onEvent({ type: 'done' });
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onExternalAbort);
      }
    },
  };
}

function dispatchSseText(
  text: string,
  onEvent: (event: SummaryStreamEvent) => void,
): void {
  const parser = createSseParser();
  let sawTerminal = false;
  for (const frame of [...parser.push(text), ...parser.flush()]) {
    const event = mapSseFrameToSummaryEvent(frame);
    if (!event) {
      continue;
    }
    onEvent(event);
    if (event.type === 'done' || event.type === 'error') {
      sawTerminal = true;
    }
  }
  if (!sawTerminal) {
    onEvent({ type: 'done' });
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  );
}

export function toSummaryUserMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.category === 'insufficient_credits') {
      return 'You do not have enough AI credits for a summary.';
    }
    if (error.category === 'cancellation') {
      return 'Summary cancelled.';
    }
  }
  if (isApiError(error)) {
    return error.message || 'Unable to summarize this thread.';
  }
  return 'Unable to summarize this thread.';
}
