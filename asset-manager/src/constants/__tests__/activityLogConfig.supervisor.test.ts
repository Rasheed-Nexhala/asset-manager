import { ACTION_TYPE_CONFIG } from '../activityLogConfig';

describe('ACTION_TYPE_CONFIG supervisor custody (mobile)', () => {
  it('includes supervisor_custody_updated for display', () => {
    const cfg = ACTION_TYPE_CONFIG.supervisor_custody_updated;
    expect(cfg.label).toMatch(/supervisor custody/i);
    expect(cfg.icon).toBeTruthy();
  });
});
