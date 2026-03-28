import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadActiveManagedSiteId, saveActiveManagedSiteId } from '../activeManagedSiteStorage';

describe('activeManagedSiteStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loadActiveManagedSiteId returns stored value', () => {
    localStorage.setItem('ciams_activeManagedSite_u1', 'site-99');
    expect(loadActiveManagedSiteId('u1')).toBe('site-99');
  });

  it('loadActiveManagedSiteId returns null when missing', () => {
    expect(loadActiveManagedSiteId('u1')).toBeNull();
  });

  it('loadActiveManagedSiteId returns null on storage errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadActiveManagedSiteId('u1')).toBeNull();
    spy.mockRestore();
  });

  it('saveActiveManagedSiteId persists site id', () => {
    saveActiveManagedSiteId('u1', 'site-a');
    expect(localStorage.getItem('ciams_activeManagedSite_u1')).toBe('site-a');
  });

  it('saveActiveManagedSiteId removes key when siteId is null', () => {
    localStorage.setItem('ciams_activeManagedSite_u1', 'x');
    saveActiveManagedSiteId('u1', null);
    expect(localStorage.getItem('ciams_activeManagedSite_u1')).toBeNull();
  });

  it('saveActiveManagedSiteId ignores errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveActiveManagedSiteId('u1', 's')).not.toThrow();
    spy.mockRestore();
  });
});
