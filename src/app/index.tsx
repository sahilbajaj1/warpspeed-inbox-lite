import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/shared/components/AppScreen';
import { spacingTokens, typographyTokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <AppScreen testID="home-screen">
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Inbox Lite
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Phase 1 foundation — authentication and inbox arrive in later slices.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typographyTokens.title,
    fontWeight: '700',
    marginBottom: spacingTokens.sm,
  },
  subtitle: {
    fontSize: typographyTokens.body,
    lineHeight: 22,
  },
});
