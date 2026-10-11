const DEFAULT_API_BASE_URL = 'https://sandbox3.staging.iamwarpspeed.com/v1';
const DEFAULT_SOCKET_URL = 'https://sandbox3.staging.iamwarpspeed.com';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function normalizeApiBaseUrl(url: string): string {
  return trimTrailingSlash(url);
}

function readOptionalString(value: string | undefined, fallback: string): string {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

function readOptionalBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/** Above PDF worst-case latency (10s) with headroom for slow mobile networks. */
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export type AppConfig = {
  readonly apiBaseUrl: string;
  readonly socketUrl: string;
  readonly enableDevLogs: boolean;
  readonly requestTimeoutMs: number;
};

export const appConfig: AppConfig = {
  apiBaseUrl: normalizeApiBaseUrl(
    readOptionalString(process.env.EXPO_PUBLIC_API_BASE_URL, DEFAULT_API_BASE_URL),
  ),
  socketUrl: trimTrailingSlash(
    readOptionalString(process.env.EXPO_PUBLIC_SOCKET_URL, DEFAULT_SOCKET_URL),
  ),
  enableDevLogs: readOptionalBoolean(process.env.EXPO_PUBLIC_ENABLE_DEV_LOGS, __DEV__),
  requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
};
