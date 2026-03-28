import { describe, it, expect } from 'vitest';
import {
  buildRequestQueryConstraints,
  REQUEST_QUEUE_NON_DRAFT_STATUSES,
} from '../requestService';

describe('REQUEST_QUEUE_NON_DRAFT_STATUSES', () => {
  it('lists every non-draft queue status and stays within Firestore in limit', () => {
    expect(REQUEST_QUEUE_NON_DRAFT_STATUSES).toEqual([
      'pending',
      'approved',
      'rejected',
      'transferred',
      'partially_returned',
      'returned',
      'cancelled',
    ]);
    expect(REQUEST_QUEUE_NON_DRAFT_STATUSES).not.toContain('draft');
    expect(REQUEST_QUEUE_NON_DRAFT_STATUSES.length).toBeLessThanOrEqual(10);
  });
});

describe('buildRequestQueryConstraints', () => {
  it('queue (no userId): status filter + orderBy (2 constraints)', () => {
    expect(buildRequestQueryConstraints({})).toHaveLength(2);
    expect(buildRequestQueryConstraints({ siteId: 'all' })).toHaveLength(2);
  });

  it('queue with specific siteId adds a third constraint', () => {
    expect(buildRequestQueryConstraints({ siteId: 'site-1' })).toHaveLength(3);
  });

  it('my requests: requestedBy + orderBy (2 constraints)', () => {
    expect(buildRequestQueryConstraints({ userId: 'user-1' })).toHaveLength(2);
  });

  it('queue with single status: equality + orderBy (2 constraints)', () => {
    expect(buildRequestQueryConstraints({ status: 'pending' })).toHaveLength(2);
  });
});
