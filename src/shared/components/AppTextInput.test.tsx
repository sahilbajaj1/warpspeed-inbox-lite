import { render, screen } from '@testing-library/react-native';

import { AppProviders } from '@/providers/AppProviders';
import { AppTextInput } from '@/shared/components/AppTextInput';

describe('AppTextInput', () => {
  it('renders label and exposes accessibility state when disabled', async () => {
    await render(
      <AppTextInput label="Email" value="a@b.com" onChangeText={jest.fn()} disabled testID="email" />,
      { wrapper: AppProviders },
    );

    const input = screen.getByTestId('email');
    expect(screen.getByText('Email')).toBeTruthy();
    expect(input.props.editable).toBe(false);
    expect(input.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('announces validation errors', async () => {
    await render(
      <AppTextInput
        label="Password"
        value=""
        onChangeText={jest.fn()}
        errorMessage="Password is required"
        testID="password"
      />,
      { wrapper: AppProviders },
    );

    expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required');
  });
});
