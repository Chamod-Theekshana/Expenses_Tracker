import React, { createContext, useCallback, useMemo, useState } from 'react';
import { ProfileService } from '../services/ProfileService';

type ProfileState = {
  name: string;
  profilePhoto: string | null;
  currency: string;
  dateFormat: string;
  biometricEnabled: boolean;
  isLoading: boolean;
};

type ProfileContextValue = ProfileState & {
  loadProfile: (userId: string) => Promise<void>;
  updateName: (userId: string, name: string) => Promise<void>;
  updatePhoto: (userId: string, photo: string) => Promise<void>;
  updateCurrency: (userId: string, currency: string) => Promise<void>;
  updateDateFormat: (userId: string, dateFormat: string) => Promise<void>;
  updateBiometricEnabled: (userId: string, enabled: boolean) => Promise<void>;
  clearProfile: () => void;
};

export const ProfileContext = createContext<ProfileContextValue>({
  name: '',
  profilePhoto: null,
  currency: 'USD',
  dateFormat: 'DD/MM/YYYY',
  biometricEnabled: false,
  isLoading: false,
  loadProfile: async () => {},
  updateName: async () => {},
  updatePhoto: async () => {},
  updateCurrency: async () => {},
  updateDateFormat: async () => {},
  updateBiometricEnabled: async () => {},
  clearProfile: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      const profile = await ProfileService.getProfile(userId);
      setName(profile.name || '');
      setProfilePhoto(profile.profilePhoto || null);
      setCurrency(profile.currency || 'USD');
      setDateFormat(profile.date_format || 'DD/MM/YYYY');
      setBiometricEnabled(Boolean((profile as any).biometric_enabled));
    } catch (error) {
      console.error('[Profile] Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateName = useCallback(async (userId: string, newName: string) => {
    const profile = await ProfileService.updateProfile(userId, { name: newName });
    setName(profile.name || '');
  }, []);

  const updatePhoto = useCallback(async (userId: string, photo: string) => {
    await ProfileService.updateProfile(userId, { profile_photo: photo });
    setProfilePhoto(photo);
  }, []);

  const updateCurrency = useCallback(async (userId: string, newCurrency: string) => {
    await ProfileService.updateProfile(userId, { currency: newCurrency });
    setCurrency(newCurrency);
  }, []);

  const updateDateFormat = useCallback(async (userId: string, newDateFormat: string) => {
    await ProfileService.updateProfile(userId, { date_format: newDateFormat });
    setDateFormat(newDateFormat);
  }, []);

  const updateBiometricEnabled = useCallback(async (userId: string, enabled: boolean) => {
    await ProfileService.updateProfile(userId, { biometric_enabled: enabled });
    setBiometricEnabled(enabled);
  }, []);

  const clearProfile = useCallback(() => {
    setName('');
    setProfilePhoto(null);
    setCurrency('USD');
    setDateFormat('DD/MM/YYYY');
    setBiometricEnabled(false);
  }, []);

  const value = useMemo(
    () => ({
      name,
      profilePhoto,
      currency,
      dateFormat,
      biometricEnabled,
      isLoading,
      loadProfile,
      updateName,
      updatePhoto,
      updateCurrency,
      updateDateFormat,
      updateBiometricEnabled,
      clearProfile,
    }),
    [
      name,
      profilePhoto,
      currency,
      dateFormat,
      biometricEnabled,
      isLoading,
      loadProfile,
      updateName,
      updatePhoto,
      updateCurrency,
      updateDateFormat,
      updateBiometricEnabled,
      clearProfile,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
