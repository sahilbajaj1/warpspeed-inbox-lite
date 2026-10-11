export type ThreadActionField = 'isRead' | 'isStarred' | 'isArchived';

export type ThreadActionCommand = {
  /** Stable id for this logical user intent (also used as Idempotency-Key). */
  id: string;
  threadId: string;
  field: ThreadActionField;
  value: boolean;
  /** Last confirmed value before this intent — used to revert permanent failures. */
  revertValue: boolean;
  status: 'queued' | 'in_flight' | 'failed';
  createdAt: number;
  /** Permanent failure message for UI; uncertain failures stay queued. */
  errorMessage?: string;
};

export type ThreadActionPatch = Partial<Record<ThreadActionField, boolean>>;
