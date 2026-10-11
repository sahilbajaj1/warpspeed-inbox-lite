import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { getCreditsStore } from '@/features/credits/credits-store';
import { SummaryPanel } from '@/features/summary/SummaryPanel';
import { UiProviders } from '@/shared/testing/UiProviders';

const mockStart = jest.fn();
const mockCancel = jest.fn();

jest.mock('@/features/summary/useThreadSummary', () => ({
  useThreadSummary: () => ({
    status: 'idle',
    text: '',
    errorMessage: null,
    hasAttempted: false,
    isStreaming: false,
    start: mockStart,
    cancel: mockCancel,
  }),
}));

describe('SummaryPanel', () => {
  beforeEach(() => {
    mockStart.mockReset();
    mockCancel.mockReset();
    getCreditsStore().clear();
  });

  it('starts a summary on press', async () => {
    getCreditsStore().setBalance(2, 'test');
    await render(<SummaryPanel threadId="thr_1" />, { wrapper: UiProviders });

    fireEvent.press(screen.getByTestId('summary-start'));
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('disables summarize when credits are zero', async () => {
    getCreditsStore().setBalance(0, 'test');
    await render(<SummaryPanel threadId="thr_1" />, { wrapper: UiProviders });

    await waitFor(() => {
      expect(screen.getByTestId('summary-start')).toBeDisabled();
    });
    expect(screen.getByText(/no AI credits remaining/i)).toBeTruthy();
  });
});
