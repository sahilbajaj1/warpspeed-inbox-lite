import { StyleSheet, View } from 'react-native';

import type { ThreadDetail } from '@/core/api/schemas';
import { MessageBody } from '@/features/threads/components/MessageBody';
import {
  getMessageSenderLabel,
  getMessageTimestampLabel,
} from '@/features/threads/models/message-order';
import { AppText } from '@/shared/components/AppText';
import { borderTokens, radiusTokens, spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

type Message = ThreadDetail['messages'][number];

export type MessageCardProps = {
  message: Message;
  testID?: string;
};

export function MessageCard({ message, testID }: MessageCardProps) {
  const { colors } = useTheme();
  const sender = getMessageSenderLabel(message);
  const timestamp = getMessageTimestampLabel(message);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.sender}>
          {sender}
        </AppText>
        {timestamp ? (
          <AppText variant="caption" tone="secondary">
            {timestamp}
          </AppText>
        ) : null}
      </View>
      {message.subject ? (
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {message.subject}
        </AppText>
      ) : null}
      <MessageBody
        bodyHtml={message.bodyHtml}
        bodyText={message.bodyText}
        testID={testID ? `${testID}-body` : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: borderTokens.width,
    borderRadius: radiusTokens.md,
    padding: spacingTokens.md,
    gap: spacingTokens.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacingTokens.sm,
    alignItems: 'center',
  },
  sender: {
    flex: 1,
  },
});
