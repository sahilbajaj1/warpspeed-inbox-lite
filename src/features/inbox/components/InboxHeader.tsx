import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MailboxSwitcher } from '@/features/inbox/components/MailboxSwitcher';
import { MAILBOX_LABELS, type MailboxView } from '@/features/inbox/models/mailbox';
import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { spacingTokens } from '@/shared/theme/tokens';

export type InboxHeaderProps = {
  view: MailboxView;
  onViewChange: (view: MailboxView) => void;
  onSignOut: () => void;
};

export function InboxHeader({ view, onViewChange, onSignOut }: InboxHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacingTokens.sm }]}>
      <ScreenHeader
        title={MAILBOX_LABELS[view]}
        subtitle="Newest first · scrolls to load more"
        rightSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            testID="logout-button"
            onPress={onSignOut}
            style={styles.signOut}
          >
            <AppText tone="accent" variant="label">
              Sign out
            </AppText>
          </Pressable>
        }
      />
      <MailboxSwitcher value={view} onChange={onViewChange} testID="mailbox-switcher" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacingTokens.md,
    paddingBottom: spacingTokens.sm,
    gap: spacingTokens.sm,
  },
  signOut: {
    minHeight: MIN_TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    paddingHorizontal: spacingTokens.sm,
  },
});