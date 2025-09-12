import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { history } from './history';

interface User {
  id: string;
  username: string;
  hasCompletedOnboarding?: boolean;
  profileimage?: string;
}

const AUTH_KEY = 'lockify-auth';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_CREDENTIALS = { username: 'parthiv21', password: 'Parthiv2011!' };
const AVATAR_CACHE_PREFIX = 'lockify-avatar-';

export function useAuth() {
  const [auth, setAuth] = useState<{ user: User; expiresAt?: number } | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed) return null;
      // Expire old sessions
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(AUTH_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const queryClient = useQueryClient();

  const setLoggedIn = (user: User, options?: { preserveExpiry?: boolean }) => {
    const currentExpiresAt = auth?.expiresAt;
    const expiresAt = options?.preserveExpiry && currentExpiresAt
      ? currentExpiresAt
      : Date.now() + SESSION_DURATION_MS;
    const value = { user: { ...user, hasCompletedOnboarding: user.hasCompletedOnboarding ?? true }, expiresAt };
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    setAuth(value);
    // notify other hook instances in same tab
    try {
      window.dispatchEvent(new CustomEvent('lockify-auth-updated'));
    } catch {}
  };

  // keep all components in sync with localStorage changes (cross-tab and same-tab custom event)
  // ensures navbar avatar updates immediately when profile updates
  React.useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(AUTH_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(AUTH_KEY);
          setAuth(null);
        } else {
          setAuth(parsed);
        }
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_KEY) syncFromStorage();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('lockify-auth-updated' as any, syncFromStorage as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('lockify-auth-updated' as any, syncFromStorage as any);
    };
  }, []);

  // Auto-logout timer based on expiresAt
  React.useEffect(() => {
    if (!auth?.expiresAt) return;
    const remaining = auth.expiresAt - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      logout();
    }, remaining);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.expiresAt]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      // default credentials
      if (
        credentials.username === DEFAULT_CREDENTIALS.username &&
        credentials.password === DEFAULT_CREDENTIALS.password
      ) {
        // restore cached avatar (survives logout/login for default user)
        let cachedAvatar: string | undefined;
        try {
          cachedAvatar = localStorage.getItem(AVATAR_CACHE_PREFIX + credentials.username) || undefined;
        } catch {}
        return { id: 'default', username: credentials.username, profileimage: cachedAvatar, hasCompletedOnboarding: true } as User;
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
    onSuccess: (user) => {
      setLoggedIn(user);
      try {
        history.add({ type: 'login', summary: `Logged in as ${user.username}` });
      } catch {}
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string }) => {
      // Check if username already exists before creating
      const existingRes = await apiRequest('GET', '/api/users');
      const existingUsers = (await existingRes.json()) as Array<{ id: string; username: string }>;
      const usernameTaken = existingUsers.some((u) => u.username === userData.username);
      if (usernameTaken) {
        throw new Error('this user already exist');
      }

      const randomId = Math.floor(Math.random() * 100) + 1;
      const profileimage = `https://avatar.iran.liara.run/public/${randomId}`;
      const res = await apiRequest('POST', '/api/users', { ...userData, profileimage });
      const created = await res.json();
      return { id: created.id as string, username: created.username as string, profileimage: created.profileimage as string, hasCompletedOnboarding: false } as User;
    },
    onSuccess: (user) => {
      setLoggedIn(user);
      try {
        history.add({ type: 'register', summary: `Registered new user ${user.username}` });
      } catch {}
    },
  });

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
    queryClient.clear();
    // No hard reload to avoid 404 in static deployments; ProtectedRoute will render Login
    try {
      window.dispatchEvent(new CustomEvent('lockify-auth-updated'));
    } catch {}
    try {
      history.add({ type: 'logout', summary: 'Logged out' });
    } catch {}
  };

  const updateOnboardingStatus = useMutation({
    mutationFn: async (hasCompleted: boolean) => {
      if (!auth?.user) return;
      const updated: User = { ...auth.user, hasCompletedOnboarding: hasCompleted };
      setLoggedIn(updated, { preserveExpiry: true });
      return updated;
    },
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (profileimage: string) => {
      if (!auth?.user?.id) throw new Error('Missing user id');
      // Persist to API unless default demo user
      if (auth.user.id !== 'default') {
        await apiRequest('PUT', `/api/users/${auth.user.id}`, { profileimage });
      }
      // Persist locally for default/demo user so it survives logout/login
      try {
        const usernameKey = auth.user.username || 'default';
        localStorage.setItem(AVATAR_CACHE_PREFIX + usernameKey, profileimage);
      } catch {}
      const updated: User = { ...auth.user, profileimage };
      setLoggedIn(updated, { preserveExpiry: true });
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
    updateProfileImage: updateProfileImageMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
