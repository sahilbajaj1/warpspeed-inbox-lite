import { ApiError } from '@/core/api/errors';
import { isUncertainActionFailure } from '@/features/inbox/actions/uncertain-failure';

describe('isUncertainActionFailure', () => {
  it('treats rate limits and connectivity as keep-queued', () => {
    expect(
      isUncertainActionFailure(
        new ApiError({ category: 'rate_limited', message: 'slow down', status: 429 }),
      ),
    ).toBe(true);
    expect(
      isUncertainActionFailure(
        new ApiError({ category: 'no_connection', message: 'offline' }),
      ),
    ).toBe(true);
  });

  it('treats permanent client errors as not uncertain', () => {
    expect(
      isUncertainActionFailure(
        new ApiError({ category: 'forbidden', message: 'nope', status: 403 }),
      ),
    ).toBe(false);
  });
});
