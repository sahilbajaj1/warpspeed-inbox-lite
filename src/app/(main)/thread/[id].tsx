import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { spacingTokens } from '@/shared/theme/tokens';

export default function ThreadPlaceholderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <AppScreen testID="thread-placeholder">
      <ScreenHeader title="Thread" subtitle={typeof id === 'string' ? id : 'Unknown thread'} />
      <AppText variant="body" tone="secondary" style={styles.body}>
        Thread detail rendering arrives in the next phase.
      </AppText>
      <View style={styles.actions}>
        <AppButton label="Back to inbox" variant="secondary" onPress={() => router.back()} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginBottom: spacingTokens.lg,
  },
  actions: {
    alignSelf: 'flex-start',
  },
});
