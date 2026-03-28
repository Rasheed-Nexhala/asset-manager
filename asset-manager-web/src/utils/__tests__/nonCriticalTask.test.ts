import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runNonCriticalTask } from '../nonCriticalTask';

describe('nonCriticalTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns result on success', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const p = runNonCriticalTask('task-success', fn, { feature: 'test' });
    await expect(p).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds after failure when retries allow', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok');

    const p = runNonCriticalTask('task-retry', fn, {
      feature: 'test',
      retry: { retries: 1, baseDelayMs: 1000, maxDelayMs: 15000 },
    });

    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calls onFailure when all attempts fail', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = new Error('fail');
    const fn = vi.fn().mockRejectedValue(err);
    const onFailure = vi.fn();

    const p = runNonCriticalTask('task-fail', fn, {
      feature: 'test',
      retry: { retries: 1 },
      onFailure,
    });

    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledWith(err);
    warnSpy.mockRestore();
  });
});
