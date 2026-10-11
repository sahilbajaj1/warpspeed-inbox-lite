import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { usePrefersReducedMotion } from '@/shared/a11y/usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reflects the OS reduce-motion setting', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

    const { result } = await renderHook(() => usePrefersReducedMotion());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('updates when reduceMotionChanged fires', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    let listener: ((enabled: boolean) => void) | undefined;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_event, cb) => {
      listener = cb as unknown as (enabled: boolean) => void;
      return { remove: jest.fn() } as never;
    });

    const { result } = await renderHook(() => usePrefersReducedMotion());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    await act(async () => {
      listener?.(true);
    });

    expect(result.current).toBe(true);
  });
});
