import type { ThreadActionField } from '@/features/inbox/actions/types';

export function createActionIdempotencyKey(
  threadId: string,
  field: ThreadActionField,
): string {
  return `${field}:${threadId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

export function actionQueueKey(threadId: string, field: ThreadActionField): string {
  return `${threadId}:${field}`;
}
