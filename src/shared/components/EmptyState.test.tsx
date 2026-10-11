import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppProviders } from '@/providers/AppProviders';
import { EmptyState } from '@/shared/components/EmptyState';

describe('EmptyState', () => {
  it('renders title and message', async () => {
    await render(
      <EmptyState title="No threads" message="Your inbox is empty." testID="empty" />,
      { wrapper: AppProviders },
    );

    expect(screen.getByText('No threads')).toBeTruthy();
    expect(screen.getByText('Your inbox is empty.')).toBeTruthy();
  });

  it('invokes optional action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="No threads"
        message="Your inbox is empty."
        actionLabel="Refresh"
        onAction={onAction}
        testID="empty"
      />,
      { wrapper: AppProviders },
    );

    fireEvent.press(screen.getByTestId('empty-action'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
