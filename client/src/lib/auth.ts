import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { history } from './history';
import { VibrateIfEnabled } from './vibration';
import { 
  generateBiometricToken, 
  authenticateWithBiometricToken, 
  getBiometricToken,
  removeBiometricToken,
  type BiometricToken 
} from './biometric';

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
    // Default onboarding status: demo user -> completed; others -> not completed
    const defaultOnboarding = user.id === 'default' ? true : false;
    const value = { user: { ...user, hasCompletedOnboarding: user.hasCompletedOnboarding ?? defaultOnboarding }, expiresAt };
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
      // For non-default users, default to not completed until they finish onboarding
      return { id: match.id, username: match.username, profileimage: match.profileimage, hasCompletedOnboarding: false } as User;
    },
    onSuccess: (user) => {
      setLoggedIn(user);
      // ✅ Vibration feedback on successful login
      VibrateIfEnabled.short();
      // Fire-and-forget history logging
      void history.add({ type: 'login', summary: `Logged in as ${user.username}` }).catch(() => {});
    },
  });

  // Biometric token login mutation
  const biometricLoginMutation = useMutation({
    mutationFn: async (token: BiometricToken) => {
      // For biometric token login, we trust the token and create user object
      // In a real app, you'd validate the token with the server
      let cachedAvatar: string | undefined;
      try {
        cachedAvatar = localStorage.getItem(AVATAR_CACHE_PREFIX + token.username) || undefined;
      } catch {}
      
      // Check if this is the default user or a registered user
      if (token.username === DEFAULT_CREDENTIALS.username) {
        return { 
          id: 'default', 
          username: token.username, 
          profileimage: cachedAvatar, 
          hasCompletedOnboarding: true 
        } as User;
      } else {
        // For registered users, we'd typically fetch from API
        // For now, we'll use a default structure
        return { 
          id: token.userId, 
          username: token.username, 
          profileimage: cachedAvatar, 
          hasCompletedOnboarding: false 
        } as User;
      }
    },
    onSuccess: (user) => {
      setLoggedIn(user);
      // ✅ Vibration feedback on successful biometric login
      VibrateIfEnabled.short();
      // Fire-and-forget history logging
      void history.add({ type: 'login:biometric', summary: `Biometric login as ${user.username}` }).catch(() => {});
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
      // Fire-and-forget history logging
      void history.add({ type: 'register', summary: `Registered new user ${user.username}` }).catch(() => {});
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
    // Fire-and-forget history logging
    void history.add({ type: 'logout', summary: 'Logged out' }).catch(() => {});
  };

  // Generate biometric token after successful login
  const generateTokenAfterLogin = async (user: User) => {
    try {
      const tokenResult = await generateBiometricToken(user.id, user.username);
      if (tokenResult.success) {
        console.log('Biometric token generated successfully');
      } else {
        console.warn('Failed to generate biometric token:', tokenResult.error);
      }
    } catch (error) {
      console.warn('Error generating biometric token:', error);
    }
  };

  // Biometric login function
  const biometricLogin = async (userId: string, username: string) => {
    try {
      const result = await authenticateWithBiometricToken(userId, username);
      if (result.success && result.token) {
        await biometricLoginMutation.mutateAsync(result.token);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Biometric login failed';
      return { success: false, error: errorMessage };
    }
  };

  // Check if user has biometric token
  const hasBiometricToken = () => {
    return getBiometricToken() !== null;
  };

  // Remove biometric token (for logout or settings)
  const removeBiometricAuth = () => {
    removeBiometricToken();
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
    // Biometric functions
    biometricLogin,
    hasBiometricToken,
    removeBiometricAuth,
    generateTokenAfterLogin,
    isBiometricLoginLoading: biometricLoginMutation.isPending,
  };
}
