const storageKey = (userId: string) => `ciams_activeManagedSite_${userId}`;

export function loadActiveManagedSiteId(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export function saveActiveManagedSiteId(userId: string, siteId: string | null): void {
  try {
    const key = storageKey(userId);
    if (siteId === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, siteId);
    }
  } catch {
    // ignore persistence errors
  }
}
