import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Thread } from '@/core/api/schemas';
import { ThreadListItem } from '@/features/inbox/components/ThreadListItem';
import { UiProviders } from '@/shared/testing/UiProviders';

const sampleThread: Thread = {
  id: 'thr_1',
  subject: 'Board pack',
  participants: [{ name: 'Priya Shah', email: 'priya@example.com' }],
  snippet: 'Attached is the final version',
  lastMessageAt: '2026-10-05T09:14:03Z',
  messageCount: 4,
  isRead: false,
  isStarred: true,
  isArchived: false,
  version: 17,
};

describe('ThreadListItem', () => {
  it('renders unread sender/subject and invokes onPress', async () => {
    const onPress = jest.fn();
    await render(<ThreadListItem thread={sampleThread} onPress={onPress} testID="row" />, {
      wrapper: UiProviders,
    });

    expect(screen.getByText('Priya Shah')).toBeTruthy();
    expect(screen.getByText('Board pack')).toBeTruthy();
    expect(screen.getByLabelText(/Unread/i)).toBeTruthy();
    expect(screen.getByText('Starred')).toBeTruthy();

    fireEvent.press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalledWith(sampleThread);
  });

  it('does not announce unread for read threads', async () => {
    await render(
      <ThreadListItem
        thread={{ ...sampleThread, isRead: true, isStarred: false }}
        onPress={jest.fn()}
        testID="row"
      />,
      { wrapper: UiProviders },
    );

    expect(screen.getByLabelText(/^Priya Shah/i)).toBeTruthy();
    expect(screen.queryByText('Starred')).toBeNull();
  });
});
