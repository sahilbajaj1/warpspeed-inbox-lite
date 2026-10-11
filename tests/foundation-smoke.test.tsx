import { render, waitFor } from '@testing-library/react-native';

import { AppProviders } from '@/providers/AppProviders';
import { appConfig } from '@/core/config/app-config';
import LoginScreen from '@/app/(auth)/login';

describe('Phase foundation smoke', () => {
  it('exposes typed sandbox defaults from app config', () => {
    expect(appConfig.apiBaseUrl).toBe('https://sandbox3.staging.iamwarpspeed.com/v1');
    expect(appConfig.socketUrl).toBe('https://sandbox3.staging.iamwarpspeed.com');
    expect(appConfig.requestTimeoutMs).toBeGreaterThanOrEqual(15_000);
  });

  it('renders the login screen when no session is stored', async () => {
    const { getByTestId, getByText } = await render(<LoginScreen />, { wrapper: AppProviders });

    await waitFor(() => {
      expect(getByTestId('login-screen')).toBeTruthy();
    });
    expect(getByText('Inbox Lite')).toBeTruthy();
  });
});
