import { z } from 'zod';

import { ApiError, mapHttpStatusToCategory } from '@/core/api/errors';
import { apiErrorBodySchema, apiMetaSchema, type ApiMeta } from '@/core/api/schemas';
import { parseRetryAfterSeconds } from '@/core/api/retry-policy';

export type ParsedEnvelope<T> = {
  data: T;
  meta: ApiMeta;
};

export function parseJsonUnknown(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiError({
      category: 'invalid_response',
      message: 'Response was not valid JSON.',
      cause,
    });
  }
}

export function parseApiErrorFromBody(
  body: unknown,
  status: number,
  headers?: Headers,
): ApiError {
  const parsed = apiErrorBodySchema.safeParse(body);
  const code = parsed.success ? parsed.data.error.code : undefined;
  const serverMessage = parsed.success ? parsed.data.error.message : undefined;
  const category = mapHttpStatusToCategory(status, code);
  const retryAfterSeconds = parseRetryAfterSeconds(headers?.get('retry-after'));

  return new ApiError({
    category,
    code,
    status,
    message: serverMessage ?? `Request failed with status ${status}.`,
    retryAfterSeconds: retryAfterSeconds ?? undefined,
    retryable: category === 'rate_limited' || category === 'server_failure',
    outcomeUncertain: status >= 500,
  });
}

export function parseEnvelope<T>(
  body: unknown,
  dataSchema: z.ZodType<T>,
): ParsedEnvelope<T> {
  const schema = z.object({
    data: dataSchema,
    meta: apiMetaSchema.optional(),
  });
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new ApiError({
      category: 'invalid_response',
      message: 'Response did not match the expected envelope.',
      cause: result.error,
    });
  }

  const metaResult = apiMetaSchema.safeParse(result.data.meta ?? {});
  if (!metaResult.success) {
    throw new ApiError({
      category: 'invalid_response',
      message: 'Response meta was invalid.',
      cause: metaResult.error,
    });
  }

  return {
    data: result.data.data,
    meta: metaResult.data,
  };
}

export function extractUserBalanceHeader(headers: Headers): number | undefined {
  const raw = headers.get('x-user-balance');
  if (raw === null || raw.trim() === '') {
    return undefined;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return value;
}
