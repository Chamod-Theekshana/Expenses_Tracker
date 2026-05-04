import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await EncryptedStorage.getItem(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await EncryptedStorage.setItem(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  try {
    await EncryptedStorage.removeItem(key);
  } catch {
    // Fallback to AsyncStorage cleanup below.
  }
  await AsyncStorage.removeItem(key).catch(() => {});
}
