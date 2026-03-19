import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";
import { history } from "./history";
import { VibrateIfEnabled } from "./vibration";
import {
  generateBiometricToken,
  authenticateWithBiometricToken,
  getBiometricToken,
  removeBiometricToken,
  type BiometricToken,
} from "./biometric";

interface User {
  id: string;
  username: string;
  hasCompletedOnboarding?: boolean;
  profileimage?: string;
}

type AuthState = {
  user: User;
  token?: string;
  expiresAt?: number;
};

const AUTH_KEY = "lockify-auth";
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const AVATAR_CACHE_PREFIX = "lockify-avatar-";

export function useAuth() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
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

  const setLoggedIn = (user: User, token?: string, options?: { preserveExpiry?: boolean }) => {
    const currentExpiresAt = auth?.expiresAt;
    const expiresAt =
      options?.preserveExpiry && currentExpiresAt
        ? currentExpiresAt
        : Date.now() + SESSION_DURATION_MS;
    const value: AuthState = {
      user: {
        ...user,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
      },
      token: token ?? auth?.token,
      expiresAt,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
    setAuth(value);
    // notify other hook instances in same tab
    try {
      window.dispatchEvent(new CustomEvent("lockify-auth-updated"));
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
    window.addEventListener("storage", onStorage);
    window.addEventListener("lockify-auth-updated" as any, syncFromStorage as any);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("lockify-auth-updated" as any, syncFromStorage as any);
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
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      const body = await res.json() as { user: User; token: string };
      if (!body?.user || !body?.token) {
        throw new Error("Invalid login response from server");
      }
      return body;
    },
    onSuccess: ({ user, token }) => {
      setLoggedIn(user, token);
      // ✅ Vibration feedback on successful login
      VibrateIfEnabled.short();
      // Fire-and-forget history logging
      void history
        .add({ type: "login", summary: `Logged in as ${user.username}` })
        .catch(() => {});
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
      return {
        id: token.userId,
        username: token.username,
        profileimage: cachedAvatar,
        hasCompletedOnboarding: false,
      } as User;
    },
    onSuccess: (user) => {
      setLoggedIn(user);
      // ✅ Vibration feedback on successful biometric login
      VibrateIfEnabled.short();
      // Fire-and-forget history logging
      void history
        .add({ type: "login:biometric", summary: `Biometric login as ${user.username}` })
        .catch(() => {});
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string }) => {
      const randomId = Math.floor(Math.random() * 100) + 1;
      const profileimage = `https://avatar.iran.liara.run/public/${randomId}`;
      const res = await apiRequest("POST", "/api/auth/register", {
        ...userData,
        profileimage,
      });
      const body = await res.json() as { user: User; token: string };
      if (!body?.user || !body?.token) {
        throw new Error("Invalid register response from server");
      }
      return body;
    },
    onSuccess: ({ user, token }) => {
      setLoggedIn(user, token);
      // Fire-and-forget history logging
      void history
        .add({ type: "register", summary: `Registered new user ${user.username}` })
        .catch(() => {});
    },
  });

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
    queryClient.clear();
    // No hard reload to avoid 404 in static deployments; ProtectedRoute will render Login
    try {
      window.dispatchEvent(new CustomEvent("lockify-auth-updated"));
    } catch {}
    // Fire-and-forget history logging
    void history.add({ type: "logout", summary: "Logged out" }).catch(() => {});
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
      const res = await apiRequest("PUT", "/api/auth/onboarding", {
        hasCompletedOnboarding: hasCompleted,
      });
      const body = (await res.json()) as { hasCompletedOnboarding: boolean };
      const updated: User = {
        ...auth.user,
        hasCompletedOnboarding: body.hasCompletedOnboarding,
      };
      setLoggedIn(updated, auth.token, { preserveExpiry: true });
      return updated;
    },
  });

  const updateProfileImageMutation = useMutation({
    mutationFn: async (profileimage: string) => {
      if (!auth?.user?.id) throw new Error("Missing user id");
      // Persist locally so it survives logout/login for this browser
      try {
        const usernameKey = auth.user.username || "default";
        localStorage.setItem(AVATAR_CACHE_PREFIX + usernameKey, profileimage);
      } catch {}
      const updated: User = { ...auth.user, profileimage };
      setLoggedIn(updated, auth.token, { preserveExpiry: true });
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
