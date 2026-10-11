import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { AppActivityIndicator } from '@/shared/components/AppActivityIndicator';

describe('AppActivityIndicator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders a static marker when reduce motion is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);

    render(<AppActivityIndicator testID="busy" accessibilityLabel="Loading inbox" />);

    await waitFor(() => {
      expect(screen.getByTestId('busy')).toBeTruthy();
    });
    expect(screen.getByLabelText('Loading inbox')).toBeTruthy();
  });
});
