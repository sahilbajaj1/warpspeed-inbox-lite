import { render, screen } from '@testing-library/react-native';

import { AppProviders } from '@/providers/AppProviders';
import { OfflineBanner } from '@/shared/components/OfflineBanner';

describe('OfflineBanner', () => {
  it('is hidden when online', async () => {
    const { queryByTestId } = await render(<OfflineBanner forceOffline={false} />, {
      wrapper: AppProviders,
    });

    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('announces offline status when forced offline', async () => {
    await render(<OfflineBanner forceOffline />, { wrapper: AppProviders });

    expect(screen.getByTestId('offline-banner')).toBeTruthy();
    expect(screen.getByText(/You are offline/i)).toBeTruthy();
  });
});
