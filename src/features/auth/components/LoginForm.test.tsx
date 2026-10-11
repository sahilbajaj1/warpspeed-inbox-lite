import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { LoginForm } from '@/features/auth/components/LoginForm';
import { UiProviders } from '@/shared/testing/UiProviders';

async function fillLoginForm(email: string, password: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('login-email'), email);
    fireEvent.changeText(screen.getByTestId('login-password'), password);
  });
}

describe('LoginForm', () => {
  it('validates required fields before submit', async () => {
    const onSubmit = jest.fn();
    await render(<LoginForm onSubmit={onSubmit} />, { wrapper: UiProviders });

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });

    expect(await screen.findByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables editing and blocks duplicate submits while loading', async () => {
    let resolveSubmit!: () => void;
    const onSubmit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );

    await render(<LoginForm onSubmit={onSubmit} />, { wrapper: UiProviders });
    await fillLoginForm('user@example.com', 'secret');

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId('login-email').props.editable).toBe(false);
    expect(screen.getByTestId('login-submit-loading')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmit();
    });
    await waitFor(() => {
      expect(screen.getByTestId('login-email').props.editable).toBe(true);
    });
  });

  it('shows invalid credential errors from onSubmit', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('Invalid email or password.');
    });

    await render(<LoginForm onSubmit={onSubmit} />, { wrapper: UiProviders });
    await fillLoginForm('user@example.com', 'wrong');

    await act(async () => {
      fireEvent.press(screen.getByTestId('login-submit'));
    });

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Invalid email or password.',
    );
  });
});
