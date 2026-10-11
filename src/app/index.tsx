import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/shared/theme/ThemeProvider';

export default function IndexScreen() {
  const { status } = useAuth();
  const { colors } = useTheme();

  if (status === 'bootstrapping') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]} testID="root-bootstrapping">
        <ActivityIndicator accessibilityLabel="Starting Inbox Lite" />
      </View>
    );
  }

  if (status === 'authenticated') {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
