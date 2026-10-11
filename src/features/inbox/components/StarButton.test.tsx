import { fireEvent, render, screen } from '@testing-library/react-native';

import { StarButton } from '@/features/inbox/components/StarButton';
import { UiProviders } from '@/shared/testing/UiProviders';

describe('StarButton', () => {
  it('invokes onPress and exposes starred state', async () => {
    const onPress = jest.fn();
    await render(<StarButton starred onPress={onPress} testID="star" />, {
      wrapper: UiProviders,
    });

    expect(screen.getByLabelText('Unstar')).toBeTruthy();
    fireEvent.press(screen.getByTestId('star'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
