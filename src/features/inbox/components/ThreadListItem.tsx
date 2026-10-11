import { Pressable, StyleSheet, View } from 'react-native';

import type { Thread } from '@/core/api/schemas';
import {
  formatThreadTimestamp,
  getThreadSenderLabel,
} from '@/features/inbox/models/thread-list';
import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type ThreadListItemProps = {
  thread: Thread;
  onPress: (thread: Thread) => void;
  testID?: string;
};

export function ThreadListItem({ thread, onPress, testID }: ThreadListItemProps) {
  const { colors } = useTheme();
  const unread = !thread.isRead;
  const sender = getThreadSenderLabel(thread);
  const timestamp = formatThreadTimestamp(thread.lastMessageAt);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${sender}. ${thread.subject}`}
      accessibilityHint="Opens the thread"
      onPress={() => onPress(thread)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surface : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.unreadDot,
          { backgroundColor: unread ? colors.accent : 'transparent' },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <AppText
            variant={unread ? 'bodyStrong' : 'body'}
            numberOfLines={1}
            style={styles.sender}
          >
            {sender}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {timestamp}
          </AppText>
        </View>
        <AppText
          variant={unread ? 'bodyStrong' : 'body'}
          numberOfLines={1}
          style={styles.subject}
        >
          {thread.subject || '(no subject)'}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {thread.snippet}
        </AppText>
        {thread.isStarred ? (
          <View
            style={[styles.starBadge, { backgroundColor: colors.accentMuted }]}
            accessibilityLabel="Starred"
          >
            <AppText variant="caption" tone="accent">
              Starred
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacingTokens.sm,
    paddingVertical: spacingTokens.sm,
    paddingHorizontal: spacingTokens.md,
    borderBottomWidth: borderTokens.width,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radiusTokens.sm,
    marginTop: 8,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacingTokens.sm,
  },
  sender: {
    flex: 1,
  },
  subject: {
    flexShrink: 1,
  },
  starBadge: {
    alignSelf: 'flex-start',
    marginTop: spacingTokens.xs,
    paddingHorizontal: spacingTokens.sm,
    paddingVertical: 2,
    borderRadius: radiusTokens.sm,
  },
});
