import { StyleSheet, View } from 'react-native';

import type { Thread } from '@/core/api/schemas';
import { StarButton } from '@/features/inbox/components/StarButton';
import { useThreadActions } from '@/features/inbox/hooks/useThreadActions';
import { AppButton } from '@/shared/components/AppButton';
import { PendingActionIndicator } from '@/shared/components/PendingActionIndicator';
import { spacingTokens } from '@/shared/theme/tokens';

export type ThreadActionBarProps = {
  thread: Thread;
  testID?: string;
};

export function ThreadActionBar({ thread, testID }: ThreadActionBarProps) {
  const actions = useThreadActions(thread);

  return (
    <View testID={testID} style={styles.bar} accessibilityRole="toolbar">
      <View style={styles.row}>
        <StarButton
          starred={thread.isStarred}
          pending={Boolean(actions.pending.isStarred)}
          onPress={actions.toggleStarred}
          testID="action-star"
        />
        <AppButton
          label={thread.isArchived ? 'Move to inbox' : 'Archive'}
          variant="secondary"
          onPress={() => actions.setArchived(!thread.isArchived)}
          testID="action-archive"
          style={styles.flexButton}
          accessibilityHint={
            actions.pending.isArchived ? 'Archive change is syncing' : undefined
          }
        />
        <AppButton
          label={thread.isRead ? 'Mark unread' : 'Mark read'}
          variant="secondary"
          onPress={() => actions.setRead(!thread.isRead)}
          testID="action-read"
          style={styles.flexButton}
          accessibilityHint={actions.pending.isRead ? 'Read state is syncing' : undefined}
        />
      </View>
      {actions.isPending ? <PendingActionIndicator label="Syncing changes…" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingTokens.sm,
  },
  flexButton: {
    flex: 1,
  },
});
