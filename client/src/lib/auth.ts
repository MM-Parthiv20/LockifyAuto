import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Authentication failed');
      }
      return res.json();
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/login', credentials);
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/auth/register', userData);
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      setToken(data.token);
      localStorage.setItem(TOKEN_KEY, data.token);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logout = () => {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    queryClient.clear();
    // Force reload to redirect to login page
    window.location.reload();
  };

  const updateOnboardingStatus = useMutation({
    mutationFn: async (hasCompleted: boolean) => {
      const res = await apiRequest("PUT", "/api/auth/onboarding", { hasCompletedOnboarding: hasCompleted });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  // Set up axios interceptor for authenticated requests
  useEffect(() => {
    if (token) {
      const originalFetch = window.fetch;
      window.fetch = async (url, options = {}) => {
        if (typeof url === 'string' && url.startsWith('/api') && url !== '/api/auth/login' && url !== '/api/auth/register') {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
          };
        }
        return originalFetch(url, options);
      };
    }
  }, [token]);

  return {
    user,
    isLoading: isLoading && !!token,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    updateOnboardingStatus: updateOnboardingStatus.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
  };
}
