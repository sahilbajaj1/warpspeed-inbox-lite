import { hasLoginFormErrors, validateLoginForm } from '@/features/auth/validation';

describe('validateLoginForm', () => {
  it('accepts a well-formed email and password', () => {
    const errors = validateLoginForm({ email: 'user@example.com', password: 'secret' });
    expect(hasLoginFormErrors(errors)).toBe(false);
  });

  it('rejects invalid email shapes', () => {
    const errors = validateLoginForm({ email: 'not-an-email', password: 'secret' });
    expect(errors.email).toMatch(/valid email/i);
  });
});
