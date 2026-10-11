import { z } from 'zod';

import type { ApiClient } from '@/core/api/client';
import { emptyObjectSchema } from '@/core/api/schemas';

export const chaosConfigSchema = z.object({
  failureRate: z.number().min(0).max(1),
  latencyMs: z.number().int().nonnegative(),
});

export type ChaosConfig = z.infer<typeof chaosConfigSchema>;

export const CHAOS_OFF: ChaosConfig = {
  failureRate: 0,
  latencyMs: 0,
};

export type DevApi = {
  /** Restore inbox + credits to a known baseline (DEV-01). */
  reset: (signal?: AbortSignal) => Promise<void>;
  /** Configure sandbox failure/latency injection (DEV-02). Always restore with CHAOS_OFF. */
  setChaos: (config: ChaosConfig, signal?: AbortSignal) => Promise<void>;
  /** Trigger ~200 threads over ~10s (DEV-03). */
  burst: (signal?: AbortSignal) => Promise<void>;
};

/**
 * Sandbox-only developer tools. Never call these against a non-assigned account.
 */
export function createDevApi(client: ApiClient): DevApi {
  return {
    async reset(signal) {
      await client.request({
        method: 'POST',
        path: '/dev/reset',
        schema: emptyObjectSchema,
        signal,
        retry: false,
      });
    },

    async setChaos(config, signal) {
      const body = chaosConfigSchema.parse(config);
      await client.request({
        method: 'POST',
        path: '/dev/chaos',
        body,
        schema: emptyObjectSchema,
        signal,
        retry: false,
      });
    },

    async burst(signal) {
      await client.request({
        method: 'POST',
        path: '/dev/burst',
        schema: emptyObjectSchema,
        signal,
        retry: false,
      });
    },
  };
}

/**
 * Apply chaos for the duration of `work`, then always restore to off (AS-24).
 * Prefer `npm run sandbox:chaos-off` if a restore call itself fails.
 */
export async function withChaos<T>(
  devApi: DevApi,
  config: ChaosConfig,
  work: () => Promise<T>,
): Promise<T> {
  await devApi.setChaos(config);
  try {
    return await work();
  } finally {
    await devApi.setChaos(CHAOS_OFF);
  }
}
