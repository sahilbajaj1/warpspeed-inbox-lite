import { z } from 'zod';

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const apiMetaSchema = z
  .object({
    userBalance: z.number().int().nonnegative().optional(),
    nextCursor: z.string().nullable().optional(),
    syncToken: z.string().optional(),
  })
  .passthrough();

export const participantSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().min(1),
});

export const threadSchema = z.object({
  id: z.string().min(1),
  subject: z.string(),
  participants: z.array(participantSchema),
  snippet: z.string(),
  lastMessageAt: z.string().min(1),
  messageCount: z.number().int().nonnegative(),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  isArchived: z.boolean(),
  version: z.number().int().nonnegative(),
});

export const messageSchema = z.object({
  id: z.string().min(1),
  from: participantSchema.optional(),
  sender: participantSchema.optional(),
  to: z.array(participantSchema).optional(),
  sentAt: z.string().optional(),
  createdAt: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  subject: z.string().optional(),
});

export const threadDetailSchema = threadSchema.extend({
  messages: z.array(messageSchema),
});

export const threadListDataSchema = z.union([
  z.array(threadSchema),
  z.object({
    threads: z.array(threadSchema),
  }),
]);

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export const emptyObjectSchema = z.object({}).passthrough();

export const syncChangeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('thread.upsert'),
    thread: threadSchema,
  }),
  z.object({
    type: z.literal('thread.delete'),
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
  }),
]);

export const syncDataSchema = z.object({
  changes: z.array(syncChangeSchema),
  syncToken: z.string().min(1),
  hasMore: z.boolean(),
});

/** Socket payload shapes (PDF: upserted/deleted naming differs from /sync). */
export const socketThreadUpsertedSchema = z.object({
  thread: threadSchema,
  syncToken: z.string().optional(),
});

export const socketThreadDeletedSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().nonnegative(),
  syncToken: z.string().optional(),
});

export const socketBalanceUpdatedSchema = z.object({
  userBalance: z.number().int().nonnegative(),
});

export const socketUnauthorizedSchema = z
  .object({
    code: z.string().optional(),
  })
  .passthrough();

export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type ThreadDetail = z.infer<typeof threadDetailSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type SyncData = z.infer<typeof syncDataSchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
export type SocketThreadUpsertedPayload = z.infer<typeof socketThreadUpsertedSchema>;
export type SocketThreadDeletedPayload = z.infer<typeof socketThreadDeletedSchema>;
export type SocketBalanceUpdatedPayload = z.infer<typeof socketBalanceUpdatedSchema>;

export function normalizeThreadList(data: z.infer<typeof threadListDataSchema>): Thread[] {
  return Array.isArray(data) ? data : data.threads;
}
