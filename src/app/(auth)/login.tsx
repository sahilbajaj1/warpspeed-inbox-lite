import { Redirect } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { LoginForm } from '@/features/auth/components/LoginForm';
import {
  fetchDevSandboxCreds,
  isDemoAutoLoginEnabled,
} from '@/features/auth/devSandboxCreds';
import { AppScreen } from '@/shared/components/AppScreen';
import { AppText } from '@/shared/components/AppText';
import { OfflineBanner } from '@/shared/components/OfflineBanner';
import { ScreenHeader } from '@/shared/components/ScreenHeader';
import { spacingTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export default function LoginScreen() {
  const { status, login } = useAuth();
  const { colors } = useTheme();
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    if (status !== 'unauthenticated' || !isDemoAutoLoginEnabled() || autoLoginStarted.current) {
      return;
    }
    autoLoginStarted.current = true;
    void (async () => {
      const creds = await fetchDevSandboxCreds();
      if (!creds) {
        return;
      }
      try {
        await login(creds);
      } catch {
        // Keep the form visible if auto-login fails.
      }
    })();
  }, [login, status]);

  if (status === 'bootstrapping') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]} testID="auth-bootstrapping">
        <ActivityIndicator accessibilityLabel="Restoring session" />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/(main)" />;
  }

  return (
    <View style={styles.root}>
      <OfflineBanner />
      <AppScreen keyboardSafe testID="login-screen">
        <ScreenHeader title="Inbox Lite" subtitle="Sign in with your warpSpeed test account." />
        <AppText variant="body" tone="secondary" style={styles.hint}>
          Credentials stay on this device and are never committed to the repository.
        </AppText>
        <LoginForm
          testID="login-form"
          onSubmit={async (values) => {
            await login(values);
          }}
        />
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginBottom: spacingTokens.lg,
  },
});
