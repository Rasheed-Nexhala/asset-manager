import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/firebase', () => ({
  db: {},
}));

const onSnapshotMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'requests-col'),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
}));

import { subscribeToRequests } from '../requestService';

describe('subscribeToRequests', () => {
  beforeEach(() => {
    onSnapshotMock.mockReset();
  });

  it('invokes callback with an empty array when the snapshot listener reports an error', () => {
    const callback = vi.fn();
    onSnapshotMock.mockImplementation(
      (_q: unknown, _onNext: unknown, onError?: (err: Error) => void) => {
        onError?.(new Error('The query requires an index'));
        return vi.fn();
      }
    );

    subscribeToRequests({ userId: 'user-1', siteId: 'site-1' }, callback);

    expect(onSnapshotMock).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith([]);
  });

  it('calls optional onError when the snapshot listener reports an error', () => {
    const callback = vi.fn();
    const onError = vi.fn();
    onSnapshotMock.mockImplementation(
      (_q: unknown, _onNext: unknown, onError?: (err: Error) => void) => {
        onError?.(new Error('The query requires an index'));
        return vi.fn();
      }
    );

    subscribeToRequests({ userId: 'user-1', siteId: 'site-1' }, callback, onError);

    expect(callback).toHaveBeenCalledWith([]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'The query requires an index' }));
  });
});
