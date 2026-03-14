/**
 * Non-critical task runner - Web version
 * Sentry integration can be added later. Console logging for now.
 */

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

function getBackoffDelayMs(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 15000
): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);
  return Math.min(exponentialDelay, maxDelayMs);
}

export async function runNonCriticalTask<T>(
  taskName: string,
  fn: () => Promise<T>,
  options: NonCriticalTaskOptions
): Promise<T | undefined> {
  const { feature, retry, onFailure } = options;
  let lastError: unknown;
  const maxAttempts = retry ? retry.retries + 1 : 1;
  const baseDelayMs = retry?.baseDelayMs ?? 1000;
  const maxDelayMs = retry?.maxDelayMs ?? 15000;
  const shouldRetry = retry?.shouldRetry ?? (() => true);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && shouldRetry(error, attempt)) {
        const delay = getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  const nextCount = (failureCountByTask.get(taskName) ?? 0) + 1;
  failureCountByTask.set(taskName, nextCount);
  if (nextCount === 1 || nextCount % 5 === 0) {
    console.warn(`[nonCriticalTask] ${taskName} failed:`, lastError);
  }
  onFailure?.(lastError);
  return undefined;
}
