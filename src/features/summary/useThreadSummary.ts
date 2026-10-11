import { useCallback, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/core/api/errors';
import { getSessionManager } from '@/core/auth/auth-runtime';
import { logger } from '@/core/logging/logger';
import { getCreditsStore } from '@/features/credits/credits-store';
import {
  createSummaryApi,
  toSummaryUserMessage,
} from '@/features/summary/summary-api';

export type SummaryStatus = 'idle' | 'streaming' | 'done' | 'error';

export type ThreadSummaryState = {
  status: SummaryStatus;
  text: string;
  errorMessage: string | null;
  /** True after a stream was started this session for this mount (blocks auto-retry). */
  hasAttempted: boolean;
};

const summaryApi = createSummaryApi();

export function useThreadSummary(threadId: string) {
  const [state, setState] = useState<ThreadSummaryState>({
    status: 'idle',
    text: '',
    errorMessage: null,
    hasAttempted: false,
  });
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      inFlightRef.current = false;
    };
  }, [threadId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    setState((prev) =>
      prev.status === 'streaming'
        ? {
            ...prev,
            status: prev.text ? 'done' : 'error',
            errorMessage: prev.text ? prev.errorMessage : 'Summary cancelled.',
          }
        : prev,
    );
  }, []);

  const start = useCallback(async () => {
    // Guard against double-tap / overlapping streams (SUM-02 — no auto re-request).
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: 'streaming',
      text: '',
      errorMessage: null,
      hasAttempted: true,
    });

    try {
      const token = await getSessionManager().getAccessToken();
      if (!token) {
        throw new Error('You must be signed in to summarize.');
      }

      await summaryApi.streamSummary({
        threadId,
        accessToken: token,
        signal: controller.signal,
        handlers: {
          onUserBalance: (balance) => {
            getCreditsStore().setBalance(balance, 'summary_header');
          },
          onEvent: (event) => {
            if (event.type === 'delta') {
              setState((prev) => ({
                ...prev,
                status: 'streaming',
                text: prev.text + event.text,
              }));
              return;
            }
            if (event.type === 'error') {
              setState((prev) => ({
                ...prev,
                status: 'error',
                errorMessage: event.message,
              }));
              return;
            }
            setState((prev) => ({
              ...prev,
              status: 'done',
              errorMessage: null,
            }));
          },
        },
      });

      setState((prev) => {
        if (prev.status === 'streaming') {
          return { ...prev, status: 'done' };
        }
        return prev;
      });
    } catch (error) {
      if (controller.signal.aborted || (isApiError(error) && error.category === 'cancellation')) {
        setState((prev) => ({
          ...prev,
          status: prev.text ? 'done' : 'error',
          errorMessage: prev.text ? null : 'Summary cancelled.',
          hasAttempted: true,
        }));
        return;
      }

      logger.warn('summary stream failed', {
        category: isApiError(error) ? error.category : 'unknown',
      });
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: toSummaryUserMessage(error),
        hasAttempted: true,
      }));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      inFlightRef.current = false;
    }
  }, [threadId]);

  return {
    ...state,
    isStreaming: state.status === 'streaming',
    start,
    cancel,
  };
}
