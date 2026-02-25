import { useState, useCallback } from 'react';
import { User } from '../models/User';
import { ProfileService } from '../services/ProfileService';

export const useProfileViewModel = () => {
  const [profile, setProfile] = useState<Partial<User>>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await ProfileService.getProfile(userId);
      setProfile(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateName = useCallback(async (userId: string, name: string) => {
    const data = await ProfileService.updateProfile(userId, { name });
    setProfile(data);
  }, []);

  const updatePhoto = useCallback(async (userId: string, photo: string) => {
    const data = await ProfileService.updateProfile(userId, { profile_photo: photo });
    setProfile(data);
  }, []);

  const updateTheme = useCallback(async (userId: string, theme: string) => {
    const data = await ProfileService.updateProfile(userId, { theme });
    setProfile(data);
  }, []);

  return {
    profile,
    isLoading,
    loadProfile,
    updateName,
    updatePhoto,
    updateTheme,
  };
};
