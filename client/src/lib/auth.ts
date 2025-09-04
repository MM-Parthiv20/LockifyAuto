import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

interface User {
  id: string;
  username: string;
  hasCompletedOnboarding?: boolean;
  profileimage?: string;
}

const AUTH_KEY = 'lockify-auth';
const DEFAULT_CREDENTIALS = { username: 'parthiv21', password: 'Parthiv2011!' };

export function useAuth() {
  const [auth, setAuth] = useState<{ user: User } | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const queryClient = useQueryClient();

  const setLoggedIn = (user: User) => {
    const value = { user: { ...user, hasCompletedOnboarding: user.hasCompletedOnboarding ?? true } };
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    setAuth(value);
  };

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      // default credentials
      if (
        credentials.username === DEFAULT_CREDENTIALS.username &&
        credentials.password === DEFAULT_CREDENTIALS.password
      ) {
        return { id: 'default', username: credentials.username, hasCompletedOnboarding: true } as User;
      }
      // Otherwise, check against MockAPI users
      const res = await apiRequest('GET', '/api/users');
      const users = (await res.json()) as Array<{ id: string; username: string; password: string; profileimage?: string }>;
      const match = users.find(
        (u) => u.username === credentials.username && u.password === credentials.password,
      );
      if (!match) throw new Error('Invalid credentials');
      return { id: match.id, username: match.username, profileimage: match.profileimage, hasCompletedOnboarding: true } as User;
    },
    onSuccess: (user) => setLoggedIn(user),
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string }) => {
      const randomId = Math.floor(Math.random() * 100) + 1;
      const profileimage = `https://avatar.iran.liara.run/public/${randomId}`;
      const res = await apiRequest('POST', '/api/users', { ...userData, profileimage });
      const created = await res.json();
      return { id: created.id as string, username: created.username as string, profileimage: created.profileimage as string } as User;
    },
    onSuccess: (user) => setLoggedIn(user),
  });

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
    queryClient.clear();
    window.location.replace('/login');
  };

  const updateOnboardingStatus = useMutation({
    mutationFn: async (hasCompleted: boolean) => {
      if (!auth?.user) return;
      const updated: User = { ...auth.user, hasCompletedOnboarding: hasCompleted };
      setLoggedIn(updated);
      return updated;
    },
  });

  return {
    user: auth?.user ?? null,
    isLoading: false,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    updateOnboardingStatus: updateOnboardingStatus.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
