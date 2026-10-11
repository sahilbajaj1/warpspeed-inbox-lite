import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { AppButton } from '@/shared/components/AppButton';
import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { spacingTokens } from '@/shared/theme/tokens';

export default function MainHomeScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <AppScreen testID="main-home-screen">
        <ScreenHeader title="Inbox Lite" subtitle="Signed in — inbox arrives in the next phase." />
        <AppText variant="body" tone="secondary" style={styles.body}>
          Authentication, secure refresh-token storage, and single-flight token rotation are active.
        </AppText>
        <AppButton
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void logout();
          }}
          testID="logout-button"
        />
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    marginBottom: spacingTokens.lg,
  },
});
