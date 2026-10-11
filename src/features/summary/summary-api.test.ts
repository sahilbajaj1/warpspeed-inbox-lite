import { ApiError } from '@/core/api/errors';
import { createSummaryApi } from '@/features/summary/summary-api';

function sseResponse(body: string, init?: { status?: number; balance?: string }): Response {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
  });
  if (init?.balance) {
    headers.set('X-User-Balance', init.balance);
  }
  return new Response(body, {
    status: init?.status ?? 200,
    headers,
  });
}

describe('createSummaryApi', () => {
  it('streams delta/done events and reads X-User-Balance', async () => {
    const events: unknown[] = [];
    const balances: number[] = [];
    const fetchImpl = jest.fn(async () =>
      sseResponse(
        'event: delta\ndata: {"text":"Hi"}\n\nevent: delta\ndata: {"text":" there"}\n\nevent: done\ndata: {}\n\n',
        { balance: '7' },
      ),
    );

    const api = createSummaryApi({
      baseUrl: 'https://example.test/v1',
      fetchImpl,
    });

    await api.streamSummary({
      threadId: 'thr_1',
      accessToken: 'tok',
      handlers: {
        onEvent: (event) => events.push(event),
        onUserBalance: (balance) => balances.push(balance),
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/v1/threads/thr_1/summary',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'text/event-stream',
          Authorization: 'Bearer tok',
        }),
      }),
    );
    expect(balances).toEqual([7]);
    expect(events).toEqual([
      { type: 'delta', text: 'Hi' },
      { type: 'delta', text: ' there' },
      { type: 'done' },
    ]);
  });

  it('maps 402 insufficient_credits without starting a stream body parse', async () => {
    const fetchImpl = jest.fn(async () =>
      new Response(
        JSON.stringify({
          error: { code: 'insufficient_credits', message: 'No credits' },
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const api = createSummaryApi({ fetchImpl, baseUrl: 'https://example.test/v1' });
    const onEvent = jest.fn();

    await expect(
      api.streamSummary({
        threadId: 'thr_1',
        accessToken: 'tok',
        handlers: { onEvent },
      }),
    ).rejects.toMatchObject({
      category: 'insufficient_credits',
      status: 402,
    } satisfies Partial<ApiError>);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('does not auto-retry after a failed stream start', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const api = createSummaryApi({ fetchImpl, baseUrl: 'https://example.test/v1' });

    await expect(
      api.streamSummary({
        threadId: 'thr_1',
        accessToken: 'tok',
        handlers: { onEvent: jest.fn() },
      }),
    ).rejects.toMatchObject({ category: 'no_connection' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
