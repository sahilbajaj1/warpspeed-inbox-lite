import { StyleSheet, View } from 'react-native';

import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';
import { LoadingSkeleton } from '@/shared/components/LoadingSkeleton';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { spacingTokens } from '@/shared/theme/tokens';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <OfflineBanner />
      <AppScreen testID="home-screen">
        <ScreenHeader
          title="Inbox Lite"
          subtitle="Phase 2 design primitives — authentication and inbox arrive next."
        />
        <AppText variant="body" tone="secondary">
          Shared UI building blocks are ready for login and list states.
        </AppText>
        <View style={styles.preview} accessibilityLabel="Loading preview">
          <LoadingSkeleton lines={2} testID="home-skeleton-preview" />
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  preview: {
    marginTop: spacingTokens.lg,
  },
});
