import { Pressable, StyleSheet, View } from 'react-native';

import {
  MAILBOX_LABELS,
  MAILBOX_VIEWS,
  type MailboxView,
} from '@/features/inbox/models/mailbox';
import { MIN_TOUCH_TARGET_SIZE } from '@/shared/a11y/conventions';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type MailboxSwitcherProps = {
  value: MailboxView;
  onChange: (view: MailboxView) => void;
  testID?: string;
};

export function MailboxSwitcher({ value, onChange, testID }: MailboxSwitcherProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {MAILBOX_VIEWS.map((view) => {
        const selected = view === value;
        return (
          <Pressable
            key={view}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={MAILBOX_LABELS[view]}
            testID={`mailbox-tab-${view}`}
            onPress={() => onChange(view)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected ? colors.background : 'transparent',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText variant="label" tone={selected ? 'accent' : 'secondary'}>
              {MAILBOX_LABELS[view]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.xs,
    gap: spacingTokens.xs,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET_SIZE - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusTokens.sm,
    paddingHorizontal: spacingTokens.sm,
  },
});
