import { describe, it, expect } from 'vitest';
import { ACTION_TYPE_CONFIG } from '../activityLogConfig';

describe('ACTION_TYPE_CONFIG supervisor custody', () => {
  it('includes supervisor_custody_updated with label and icon for audit UI', () => {
    const cfg = ACTION_TYPE_CONFIG.supervisor_custody_updated;
    expect(cfg).toBeDefined();
    expect(cfg.label).toMatch(/supervisor custody/i);
    expect(cfg.icon).toBeTruthy();
    expect(cfg.category).toBe('requests');
  });
});
