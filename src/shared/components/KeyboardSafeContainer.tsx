import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

type KeyboardSafeContainerProps = PropsWithChildren<{
  testID?: string;
}>;

export function KeyboardSafeContainer({ children, testID }: KeyboardSafeContainerProps) {
  return (
    <KeyboardAvoidingView
      testID={testID}
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
