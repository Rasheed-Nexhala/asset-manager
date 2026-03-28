import { describe, it, expect } from 'vitest';
import { normalizeVehicleNumber } from '../vehicleNumberUtils';

describe('normalizeVehicleNumber', () => {
  it('trims and lowercases', () => {
    expect(normalizeVehicleNumber('  TN-10-XY-1  ')).toBe('tn-10-xy-1');
  });
});
