import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppProviders } from '@/app/providers/AppProviders';
import { AppButton } from '@/shared/components/AppButton';

describe('AppButton', () => {
  it('invokes onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Continue" onPress={onPress} testID="continue-button" />, {
      wrapper: AppProviders,
    });

    fireEvent.press(screen.getByTestId('continue-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(
      <AppButton label="Continue" onPress={onPress} disabled testID="continue-button" />,
      { wrapper: AppProviders },
    );

    const button = screen.getByTestId('continue-button');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a loading state and blocks presses', async () => {
    const onPress = jest.fn();
    await render(
      <AppButton label="Continue" onPress={onPress} loading testID="continue-button" />,
      { wrapper: AppProviders },
    );

    expect(screen.getByTestId('continue-button-loading')).toBeTruthy();
    fireEvent.press(screen.getByTestId('continue-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
