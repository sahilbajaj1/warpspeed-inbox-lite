import { ApiError, toUserMessage } from '@/core/api/errors';

describe('toUserMessage', () => {
  it('never exposes raw Error messages from unknown failures', () => {
    expect(toUserMessage(new Error('ECONNRESET secret-host'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('maps known ApiError categories to safe copy', () => {
    expect(
      toUserMessage(new ApiError({ category: 'insufficient_credits', message: 'x' })),
    ).toMatch(/credits/i);
    expect(toUserMessage(new ApiError({ category: 'rate_limited', message: 'x' }))).toMatch(
      /too many requests/i,
    );
  });
});
