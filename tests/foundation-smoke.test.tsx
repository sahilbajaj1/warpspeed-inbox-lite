import { render } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { AppProviders } from '@/app/providers/AppProviders';
import { appConfig } from '@/core/config/app-config';

describe('Phase 1 foundation smoke', () => {
  it('exposes typed sandbox defaults from app config', () => {
    expect(appConfig.apiBaseUrl).toBe('https://sandbox3.staging.iamwarpspeed.com/v1');
    expect(appConfig.socketUrl).toBe('https://sandbox3.staging.iamwarpspeed.com');
  });

  it('renders the home placeholder inside providers', async () => {
    const { getByTestId, getByText } = await render(<HomeScreen />, { wrapper: AppProviders });

    expect(getByTestId('home-screen')).toBeTruthy();
    expect(getByText('Inbox Lite')).toBeTruthy();
    expect(getByText(/Phase 2 design primitives/i)).toBeTruthy();
  });
});
