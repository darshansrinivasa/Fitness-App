import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_LOCK_KEY = 'lifestyle_biometric_lock_enabled';

export async function getBiometricLockEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
  return value === '1';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, enabled ? '1' : '0');
}
