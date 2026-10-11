import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThreadDetail } from '@/core/api/schemas';
import { getThreadSenderLabel } from '@/features/inbox/models/thread-list';
import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';

export type ThreadHeaderProps = {
  thread: ThreadDetail;
  onBack: () => void;
  isMarkingRead?: boolean;
};

export function ThreadHeader({ thread, onBack, isMarkingRead = false }: ThreadHeaderProps) {
  const insets = useSafeAreaInsets();
  const participants = thread.participants
    .map((participant) => participant.name?.trim() || participant.email)
    .join(', ');

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacingTokens.sm }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={styles.back}
        testID="thread-back"
      >
        <AppText tone="accent" variant="label">
          Back
        </AppText>
      </Pressable>
      <AppText variant="title" accessibilityRole="header" numberOfLines={3}>
        {thread.subject || '(no subject)'}
      </AppText>
      <AppText variant="caption" tone="secondary" numberOfLines={2}>
        {participants || getThreadSenderLabel(thread)}
      </AppText>
      <AppText variant="caption" tone="secondary">
        {thread.messageCount} message{thread.messageCount === 1 ? '' : 's'}
        {isMarkingRead ? ' · Updating read state…' : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.sm,
    gap: spacingTokens.xs,
  },
  back: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacingTokens.xs,
  },
});
