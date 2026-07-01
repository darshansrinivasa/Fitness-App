import * as LocalAuthentication from 'expo-local-authentication';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getBiometricLockEnabled, setBiometricLockEnabled } from '../lib/appLock';
import { useAuth } from './AuthContext';

interface AppLockContextValue {
  lockEnabled: boolean;
  locked: boolean;
  biometricAvailable: boolean;
  biometricLabel: string;
  unlock: () => Promise<boolean>;
  setLockEnabled: (enabled: boolean) => Promise<void>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometrics');

  useEffect(() => {
    void (async () => {
      const [enabled, hasHardware, enrolled, types] = await Promise.all([
        getBiometricLockEnabled(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      setLockEnabledState(enabled);
      setBiometricAvailable(hasHardware && enrolled);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricLabel('Face unlock');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricLabel('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricLabel('Iris');
      }
      if (!session || !enabled) {
        setUnlocked(true);
      }
    })();
  }, [session]);

  useEffect(() => {
    if (!session) {
      setUnlocked(true);
      return;
    }
    if (!lockEnabled) {
      setUnlocked(true);
      return;
    }
    setUnlocked(false);
  }, [session, lockEnabled]);

  useEffect(() => {
    if (!session || !lockEnabled) return;

    const handleAppState = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        setUnlocked(false);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [session, lockEnabled]);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!lockEnabled) {
      setUnlocked(true);
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Lifestyle OS',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (result.success) {
      setUnlocked(true);
      return true;
    }
    return false;
  }, [lockEnabled]);

  const setLockEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to enable app lock',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!result.success) {
        throw new Error('Authentication required to enable app lock.');
      }
      await setBiometricLockEnabled(true);
      setLockEnabledState(true);
      setUnlocked(true);
      return;
    }
    await setBiometricLockEnabled(false);
    setLockEnabledState(false);
    setUnlocked(true);
  }, []);

  const locked = !!session && lockEnabled && !unlocked;

  const value = useMemo(
    () => ({
      lockEnabled,
      locked,
      biometricAvailable,
      biometricLabel,
      unlock,
      setLockEnabled,
    }),
    [lockEnabled, locked, biometricAvailable, biometricLabel, unlock, setLockEnabled],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
