// Auth module not used in open app build; keep minimal stub to avoid imports
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

interface User {
  id: string;
  username: string;
  hasCompletedOnboarding?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
}

const TOKEN_KEY = 'lockify-token';

export function useAuth() {
  const queryClient = useQueryClient();
  useEffect(() => {
    // no-op
  }, []);
  return {
    user: null,
    isLoading: false,
    login: async () => {},
    register: async () => {},
    logout: () => { queryClient.clear(); },
    updateOnboardingStatus: async () => {},
    isLoginLoading: false,
    isRegisterLoading: false,
  };
}
