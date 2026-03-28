import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string) => `ciams_activeManagedSite_${userId}`;

export async function loadActiveManagedSiteId(userId: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export async function saveActiveManagedSiteId(
  userId: string,
  siteId: string | null
): Promise<void> {
  try {
    const key = storageKey(userId);
    if (siteId === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, siteId);
    }
  } catch {
    // ignore persistence errors
  }
}
