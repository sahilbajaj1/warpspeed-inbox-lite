import { logger } from '@/core/logging/logger';
import { getSyncEngine } from '@/core/sync/sync-runtime';
import { getThreadActionQueue } from '@/features/inbox/actions/action-queue-runtime';

export type ForegroundRecoveryResult = {
  flushedOutbox: boolean;
  caughtUp: boolean;
};

/**
 * Best-effort recovery when the app returns to foreground or network returns:
 * flush durable outbox, then run sync catch-up if a checkpoint exists.
 */
export async function runForegroundRecovery(): Promise<ForegroundRecoveryResult> {
  const result: ForegroundRecoveryResult = {
    flushedOutbox: false,
    caughtUp: false,
  };

  try {
    getThreadActionQueue().flushQueued();
    result.flushedOutbox = true;
  } catch (error) {
    logger.warn('foreground outbox flush failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }

  try {
    await getSyncEngine().catchUp();
    result.caughtUp = true;
  } catch (error) {
    logger.warn('foreground sync catch-up failed', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }

  logger.info('foreground recovery complete', result);
  return result;
}
