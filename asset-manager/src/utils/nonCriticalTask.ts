import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

type RetryPredicate = (error: unknown, attempt: number) => boolean;

export interface NonCriticalTaskRetryOptions {
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: RetryPredicate;
}

export interface NonCriticalTaskOptions {
  feature: string;
  retry?: NonCriticalTaskRetryOptions;
  onFailure?: (error: unknown) => void;
  tags?: Record<string, string>;
}

const failureCountByTask = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldCaptureFailure(taskName: string): boolean {
  const nextCount = (failureCountByTask.get(taskName) ?? 0) + 1;
  failureCountByTask.set(taskName, nextCount);
  // Capture first failure immediately, then every 5th failure for noise control.
  return nextCount === 1 || nextCount % 5 === 0;
}

function getBackoffDelayMs(attempt: number, baseDelayMs = 1000, maxDelayMs = 15000): number {
  const exponentialDelay = baseDelayMs * (2 ** (attempt - 1));
  return Math.min(exponentialDelay, maxDelayMs);
}

function addTaskBreadcrumb(
  taskName: string,
  feature: string,
  level: 'info' | 'warning' | 'error',
  data?: Record<string, string | number | boolean | null>
): void {
  Sentry.addBreadcrumb({
    category: 'non_critical_task',
    message: taskName,
    level,
    data: {
      feature,
      platform: Platform.OS,
      ...data,
    },
  });
}

export async function runNonCriticalTask<T>(
  taskName: string,
  task: () => Promise<T>,
  options: NonCriticalTaskOptions
): Promise<T | undefined> {
  const { feature, retry, onFailure, tags } = options;
  addTaskBreadcrumb(taskName, feature, 'info', { stage: 'start' });

  const totalAttempts = (retry?.retries ?? 0) + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      const result = await task();
      addTaskBreadcrumb(taskName, feature, 'info', { stage: 'success', attempt });
      return result;
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < totalAttempts &&
        (retry?.shouldRetry ? retry.shouldRetry(error, attempt) : true);

      addTaskBreadcrumb(taskName, feature, canRetry ? 'warning' : 'error', {
        stage: 'failure',
        attempt,
        willRetry: canRetry,
      });

      if (canRetry) {
        const delayMs = getBackoffDelayMs(
          attempt,
          retry?.baseDelayMs,
          retry?.maxDelayMs
        );
        await sleep(delayMs);
        continue;
      }
      break;
    }
  }

  if (shouldCaptureFailure(taskName)) {
    Sentry.captureException(lastError, {
      tags: {
        category: 'non_critical_task',
        feature,
        taskName,
        platform: Platform.OS,
        ...tags,
      },
    });
  }

  if (onFailure) {
    onFailure(lastError);
  }

  return undefined;
}

