/**
 * Fetches sandbox credentials from the Metro DEV middleware (`/__dev/sandbox-creds`).
 * Credentials live in the Metro process env (gitignored `.env`), not the JS bundle.
 */
export async function fetchDevSandboxCreds(): Promise<{ email: string; password: string } | null> {
  if (!__DEV__) {
    return null;
  }

  try {
    const response = await fetch('http://127.0.0.1:8081/__dev/sandbox-creds');
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { email?: string; password?: string };
    if (!json.email || !json.password) {
      return null;
    }
    return { email: json.email, password: json.password };
  } catch {
    return null;
  }
}

export function isDemoAutoLoginEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_DEMO_AUTO_LOGIN === '1';
}
