import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/shared/components/AppButton';
import { AppText } from '@/shared/components/AppText';
import { AppTextInput } from '@/shared/components/AppTextInput';
import { spacingTokens } from '@/shared/theme/tokens';
import {
  hasLoginFormErrors,
  validateLoginForm,
  type LoginFormValues,
} from '@/features/auth/validation';

export type LoginFormProps = {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  testID?: string;
};

export function LoginForm({ onSubmit, testID }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    const values = { email, password };
    const errors = validateLoginForm(values);
    setFieldErrors(errors);
    setFormError(null);

    if (hasLoginFormErrors(errors)) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View testID={testID} style={styles.form}>
      <AppTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        disabled={submitting}
        errorMessage={fieldErrors.email}
        testID="login-email"
      />
      <AppTextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        disabled={submitting}
        errorMessage={fieldErrors.password}
        testID="login-password"
      />
      {formError ? (
        <AppText tone="error" variant="caption" accessibilityLiveRegion="polite" testID="login-error">
          {formError}
        </AppText>
      ) : null}
      <AppButton
        label="Sign in"
        onPress={() => {
          void handleSubmit();
        }}
        loading={submitting}
        disabled={submitting}
        testID="login-submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacingTokens.md,
  },
});
