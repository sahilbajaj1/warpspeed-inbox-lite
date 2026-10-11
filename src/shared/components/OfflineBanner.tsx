import { StyleSheet, View } from 'react-native';

import { useConnectivity } from '@/core/connectivity/ConnectivityProvider';
import { AppText } from '@/shared/components/AppText';
import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export type OfflineBannerProps = {
  /** Force visibility for tests or previews. When omitted, uses live connectivity. */
  forceOffline?: boolean;
  testID?: string;
};

export function OfflineBanner({ forceOffline, testID }: OfflineBannerProps) {
  const connectivity = useConnectivity();
  const { colors } = useTheme();
  const isOffline =
    forceOffline ?? !(connectivity.isConnected && connectivity.isInternetReachable !== false);

  if (!isOffline) {
    return null;
  }

  return (
    <View
      testID={testID ?? 'offline-banner'}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.banner, { backgroundColor: colors.offlineBanner }]}
    >
      <AppText variant="caption" style={{ color: colors.offlineBannerText }}>
        You are offline. Cached content stays available; changes sync when you reconnect.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: spacingTokens.md,
    paddingVertical: spacingTokens.sm,
  },
});
